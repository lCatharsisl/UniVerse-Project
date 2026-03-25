import { query, queryOne, transaction } from '../../../config/db';

export class AcademicService {
  static async getFreeRooms(params: any) {
    const { day, time, buildingName, floorNumber } = params;
    const rows = await query('SELECT * FROM fn_free_rooms_at_time($1, $2::time, $3, $4)', 
      [day, time, buildingName || null, floorNumber || null]);
    return rows;
  }

  static async searchStaff(params: any) {
    const { departmentId, department, name, specialization } = params;
    const rows = await query(
      `SELECT s.user_id AS staff_user_id, s.staff_id, s.staff_name, s.staff_surname, s.staff_title,
              s.description, s.department_id, d.department_name
       FROM staff s
       LEFT JOIN departments d ON d.department_id = s.department_id
       WHERE ($1::int IS NULL OR s.department_id = $1::int)
         AND ($2::text IS NULL OR d.department_name ILIKE '%' || $2 || '%')
         AND ($3::text IS NULL OR (s.staff_name || ' ' || s.staff_surname) ILIKE '%' || $3 || '%')
         AND ($4::text IS NULL OR s.staff_title ILIKE '%' || $4 || '%' OR s.description ILIKE '%' || $4 || '%')
       ORDER BY s.staff_name, s.staff_surname`,
      [departmentId ? Number(departmentId) : null, department || null, name || null, specialization || null]
    );
    return rows;
  }

  static async getStaffAvailability(staffUserId: number) {
    return await query(
      `SELECT availability_id, weekday, start_time::text, end_time::text, is_active
       FROM staff_availability
       WHERE staff_user_id = $1 AND is_active = true
       ORDER BY weekday, start_time`,
      [staffUserId]
    );
  }

  static async getStaffAvailabilityByDate(staffUserId: number, date: string) {
    return await query(
      `SELECT availability_date_id, specific_date, start_time::text, end_time::text, is_active
       FROM staff_availability_dates
       WHERE staff_user_id = $1 AND specific_date = $2::date AND is_active = true
       ORDER BY start_time`,
      [staffUserId, date]
    );
  }

  static async upsertStaffAvailability(staffUserId: number, slots: any[]) {
    return await transaction(async (client) => {
      await client.query('DELETE FROM staff_availability WHERE staff_user_id = $1', [staffUserId]);

      for (const slot of slots || []) {
        await client.query(
          `INSERT INTO staff_availability (staff_user_id, weekday, start_time, end_time, is_active)
           VALUES ($1, $2, $3::time, $4::time, true)`,
          [staffUserId, slot.weekday, slot.startTime, slot.endTime]
        );
      }

      return { success: true };
    });
  }

  static async upsertStaffAvailabilityByDate(staffUserId: number, date: string, slots: any[]) {
    return await transaction(async (client) => {
      await client.query(
        `DELETE FROM staff_availability_dates
         WHERE staff_user_id = $1 AND specific_date = $2::date`,
        [staffUserId, date]
      );

      for (const slot of slots || []) {
        await client.query(
          `INSERT INTO staff_availability_dates (staff_user_id, specific_date, start_time, end_time, is_active)
           VALUES ($1, $2::date, $3::time, $4::time, true)`,
          [staffUserId, date, slot.startTime, slot.endTime]
        );
      }

      return { success: true };
    });
  }

  static async createAppointment(studentUserId: number, data: any) {
    const staffUserId = Number(data.staffUserId);
    const date = data.date;
    const startTime = data.startTime;
    const endTime = data.endTime;

    const staffExists = await queryOne('SELECT 1 FROM staff WHERE user_id = $1', [staffUserId]);
    if (!staffExists) throw new Error('Staff member not found');

    const studentExists = await queryOne('SELECT 1 FROM students WHERE user_id = $1', [studentUserId]);
    if (!studentExists) throw new Error('Only students can create appointments');

    const availabilityByDate = await queryOne(
      `SELECT 1
       FROM staff_availability_dates
       WHERE staff_user_id = $1
         AND specific_date = $2::date
         AND start_time = $3::time
         AND end_time = $4::time
         AND is_active = true`,
      [staffUserId, date, startTime, endTime]
    );

    const weekdayRow = await queryOne<{ weekday: number }>(
      'SELECT EXTRACT(DOW FROM $1::date)::int AS weekday',
      [date]
    );
    const weekday = weekdayRow?.weekday ?? -1;
    const availabilityByWeekday = await queryOne(
      `SELECT 1
       FROM staff_availability
       WHERE staff_user_id = $1 AND weekday = $2
         AND start_time = $3::time AND end_time = $4::time AND is_active = true`,
      [staffUserId, weekday, startTime, endTime]
    );

    if (!availabilityByDate && !availabilityByWeekday) {
      throw new Error('Selected slot is not available for this date');
    }

    return await transaction(async (client) => {
      const appointmentRes = await client.query(
        `INSERT INTO appointments
          (staff_user_id, student_user_id, appointment_date, start_time, end_time, topic, notes)
         VALUES ($1, $2, $3::date, $4::time, $5::time, $6, $7)
         RETURNING appointment_id, staff_user_id, student_user_id, appointment_date, start_time::text, end_time::text, status`,
        [staffUserId, studentUserId, date, startTime, endTime, data.topic || null, data.notes || null]
      );

      const appointment = appointmentRes.rows[0];

      await client.query(
        `INSERT INTO appointment_notifications (appointment_id, recipient_user_id, message)
         VALUES ($1, $2, $3)`,
        [
          appointment.appointment_id,
          staffUserId,
          `New appointment request for ${appointment.appointment_date} ${appointment.start_time}-${appointment.end_time}`,
        ]
      );

      return appointment;
    });
  }

  static async listAppointments(userId: number, role: string, archive: boolean) {
    const archiveFilter = archive
      ? 'a.appointment_date < CURRENT_DATE'
      : 'a.appointment_date >= CURRENT_DATE';

    const roleFilter = role === 'staff'
      ? 'a.staff_user_id = $1'
      : role === 'student'
      ? 'a.student_user_id = $1'
      : '(a.staff_user_id = $1 OR a.student_user_id = $1)';

    return await query(
      `SELECT a.appointment_id, a.staff_user_id, a.student_user_id, a.appointment_date,
              a.start_time::text, a.end_time::text, a.status, a.topic, a.notes,
              a.rejection_reason, a.cancellation_reason, a.created_at, a.updated_at,
              st.staff_name, st.staff_surname, d.department_name,
              su.student_name, su.student_surname
       FROM appointments a
       LEFT JOIN staff st ON st.user_id = a.staff_user_id
       LEFT JOIN departments d ON d.department_id = st.department_id
       LEFT JOIN students su ON su.user_id = a.student_user_id
       WHERE ${roleFilter}
         AND ${archiveFilter}
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [userId]
    );
  }

  static async updateAppointmentStatus(appointmentId: number, userId: number, role: string, data: any) {
    const appointment = await queryOne<any>(
      `SELECT * FROM appointments WHERE appointment_id = $1`,
      [appointmentId]
    );
    if (!appointment) throw new Error('Appointment not found');

    const nextStatus = data.status;
    if (!['approved', 'rejected', 'cancelled'].includes(nextStatus)) {
      throw new Error('Invalid appointment status');
    }

    const isStaffOwner = appointment.staff_user_id === userId;
    const isStudentOwner = appointment.student_user_id === userId;

    if ((nextStatus === 'approved' || nextStatus === 'rejected') && !isStaffOwner) {
      throw new Error('Only assigned staff can approve or reject');
    }

    if (nextStatus === 'cancelled' && !(isStaffOwner || isStudentOwner || role === 'admin')) {
      throw new Error('Not authorized to cancel this appointment');
    }

    if (!['pending', 'approved'].includes(appointment.status) && nextStatus !== 'cancelled') {
      throw new Error('Appointment can no longer be updated');
    }

    const reason = data.reason || null;
    const rejectionReason = nextStatus === 'rejected' ? reason : null;
    const cancellationReason = nextStatus === 'cancelled' ? reason : null;
    const recipientUserId = isStaffOwner ? appointment.student_user_id : appointment.staff_user_id;

    return await transaction(async (client) => {
      const updateRes = await client.query(
        `UPDATE appointments
         SET status = $1,
             rejection_reason = COALESCE($2, rejection_reason),
             cancellation_reason = COALESCE($3, cancellation_reason)
         WHERE appointment_id = $4
         RETURNING appointment_id, staff_user_id, student_user_id, appointment_date, start_time::text, end_time::text, status, rejection_reason, cancellation_reason`,
        [nextStatus, rejectionReason, cancellationReason, appointmentId]
      );

      const updated = updateRes.rows[0];
      await client.query(
        `INSERT INTO appointment_notifications (appointment_id, recipient_user_id, message)
         VALUES ($1, $2, $3)`,
        [
          appointmentId,
          recipientUserId,
          `Appointment #${appointmentId} is now ${nextStatus}`,
        ]
      );

      return updated;
    });
  }

  static async getNotifications(userId: number) {
    return await query(
      `SELECT notification_id, appointment_id, message, is_read, created_at
       FROM appointment_notifications
       WHERE recipient_user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
  }

  static async markNotificationRead(notificationId: number, userId: number) {
    await query(
      `UPDATE appointment_notifications
       SET is_read = true
       WHERE notification_id = $1 AND recipient_user_id = $2`,
      [notificationId, userId]
    );
    return { success: true };
  }
}

import { query, queryOne, transaction } from '../../../config/db';
import { NotificationEmitterService } from '../../notifications/infrastructure/notificationEmitter.service';

/** Frontend `APPOINTMENT_TIME_SLOTS` ile aynı (grid ile eşleşmeli) */
const APPOINTMENT_TIME_SLOTS: [string, string][] = [
  ['08:40', '09:30'],
  ['09:40', '10:30'],
  ['10:40', '11:30'],
  ['11:40', '12:30'],
  ['13:30', '14:20'],
  ['14:30', '15:20'],
  ['15:30', '16:20'],
  ['16:30', '17:20'],
  ['17:40', '18:30'],
];

/** HH:MM — PG time metni 9:40:00 / 10:40:00.123 gibi gelebilir; slice(0,5) ile kırılmaz */
function toClockHm(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function slotGridKey(startHm: string, endHm: string): string {
  return `${toClockHm(startHm)}|${toClockHm(endHm)}`;
}

function calendarDateKey(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const head = s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  return s.slice(0, 10);
}

/** İstek gövdesindeki takvim gününü PG `date` ile uyumlu YYYY-MM-DD yapar (ISO timezone kayması önlenir). */
function normalizeCalendarDateInput(v: unknown): string {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error('Invalid date');
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Sunucu TZ’inden bağımsız: from–to (dahil) aralığındaki hafta içi günleri YYYY-MM-DD listeler. */
function eachWeekdayBetween(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const fp = String(fromIso).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  const ep = String(toIso).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!fp || !ep) return out;
  let cur = new Date(Date.UTC(Number(fp[1]), Number(fp[2]) - 1, Number(fp[3]), 12, 0, 0));
  const end = new Date(Date.UTC(Number(ep[1]), Number(ep[2]) - 1, Number(ep[3]), 12, 0, 0));
  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const day = String(cur.getUTCDate()).padStart(2, '0');
      out.push(`${y}-${m}-${day}`);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

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
      `SELECT d.availability_date_id, d.specific_date::text AS specific_date, d.start_time::text, d.end_time::text, d.is_active,
              EXISTS (
                SELECT 1 FROM appointments a
                WHERE a.staff_user_id = d.staff_user_id
                  AND a.appointment_date = d.specific_date
                  AND a.start_time = d.start_time
                  AND a.end_time = d.end_time
                  AND a.status IN ('pending', 'approved')
              ) AS is_booked,
              EXISTS (
                SELECT 1 FROM appointments a
                WHERE a.staff_user_id = d.staff_user_id
                  AND a.appointment_date = d.specific_date
                  AND a.start_time = d.start_time
                  AND a.end_time = d.end_time
                  AND a.status = 'approved'
              ) AS is_slot_locked
       FROM staff_availability_dates d
       WHERE d.staff_user_id = $1 AND d.specific_date = $2::date AND d.is_active = true
       ORDER BY d.start_time`,
      [staffUserId, date]
    );
  }

  /**
   * Haftalık şablon (staff_availability) + tarih bazlı satırlar (staff_availability_dates) birleşik görünümü.
   * Takvim grid’i bu listeyi bekliyor; endpoint eksik olduğunda frontend hep boş dönüyordu.
   */
  static async getStaffAvailabilityRange(
    staffUserId: number,
    fromIso: string,
    toIso: string,
    viewer?: { userId: number; role: string } | null
  ) {
    const weekly = await query<{
      weekday: number;
      start_time: string;
      end_time: string;
      is_active: boolean;
    }>(
      `SELECT weekday, start_time::text, end_time::text, COALESCE(is_active, true) AS is_active
       FROM staff_availability
       WHERE staff_user_id = $1`,
      [staffUserId]
    );

    const dateRows = await query<{
      specific_date: string;
      start_time: string;
      end_time: string;
      is_active: boolean;
      is_booked: boolean;
      is_slot_locked: boolean;
    }>(
      `SELECT d.specific_date::text AS specific_date,
              d.start_time::text AS start_time,
              d.end_time::text AS end_time,
              COALESCE(d.is_active, true) AS is_active,
              EXISTS (
                SELECT 1 FROM appointments a
                WHERE a.staff_user_id = d.staff_user_id
                  AND a.appointment_date = d.specific_date
                  AND a.start_time = d.start_time
                  AND a.end_time = d.end_time
                  AND a.status IN ('pending', 'approved')
              ) AS is_booked,
              EXISTS (
                SELECT 1 FROM appointments a
                WHERE a.staff_user_id = d.staff_user_id
                  AND a.appointment_date = d.specific_date
                  AND a.start_time = d.start_time
                  AND a.end_time = d.end_time
                  AND a.status = 'approved'
              ) AS is_slot_locked
       FROM staff_availability_dates d
       WHERE d.staff_user_id = $1
         AND d.specific_date >= $2::date
         AND d.specific_date <= $3::date`,
      [staffUserId, fromIso, toIso]
    );

    const dateMap = new Map<string, (typeof dateRows)[0]>();
    for (const r of dateRows) {
      const iso = calendarDateKey(r.specific_date);
      const k = `${iso}|${slotGridKey(r.start_time, r.end_time)}`;
      dateMap.set(k, { ...r, specific_date: iso });
    }

    const apptDetails = await query<{
      appointment_date: string;
      start_time: string;
      end_time: string;
      status: string;
      student_user_id: number;
      student_name: string | null;
      student_surname: string | null;
    }>(
      `SELECT a.appointment_date::text AS appointment_date,
              a.start_time::text AS start_time,
              a.end_time::text AS end_time,
              a.status,
              a.student_user_id,
              su.student_name,
              su.student_surname
       FROM appointments a
       LEFT JOIN students su ON su.user_id = a.student_user_id
       WHERE a.staff_user_id = $1
         AND a.appointment_date >= $2::date
         AND a.appointment_date <= $3::date
         AND a.status IN ('pending', 'approved')
       ORDER BY CASE WHEN a.status = 'approved' THEN 0 ELSE 1 END, a.created_at ASC`,
      [staffUserId, fromIso, toIso]
    );

    /** Slot anahtarı → öğrenci (önce onaylı, yoksa en eski bekleyen talep) — hoca tüm talepleri görür */
    const apptBySlotKey = new Map<
      string,
      { status: string; student_name: string | null; student_surname: string | null }
    >();
    const heldSlotKeys = new Set<string>();
    const lockedSlotKeys = new Set<string>();
    const anyApptKeys = new Set<string>();
    const isStudentViewer = viewer?.role === 'student';
    const viewerUserId = viewer?.userId != null ? Number(viewer.userId) : NaN;

    for (const a of apptDetails) {
      const dk = `${calendarDateKey(a.appointment_date)}|${slotGridKey(a.start_time, a.end_time)}`;
      anyApptKeys.add(dk);
      const st = String(a.status ?? '').trim().toLowerCase();
      if (st === 'approved') {
        heldSlotKeys.add(dk);
        lockedSlotKeys.add(dk);
      } else if (st === 'pending') {
        const isOtherStudentsPending =
          isStudentViewer && !Number.isNaN(viewerUserId) && Number(a.student_user_id) !== viewerUserId;
        if (!isOtherStudentsPending) {
          heldSlotKeys.add(dk);
        }
      }
      if (!apptBySlotKey.has(dk)) {
        apptBySlotKey.set(dk, {
          status: a.status,
          student_name: a.student_name,
          student_surname: a.student_surname,
        });
      }
    }

    const weeklyByDowSlot = new Map<string, boolean>();
    for (const w of weekly) {
      weeklyByDowSlot.set(`${w.weekday}|${slotGridKey(w.start_time, w.end_time)}`, w.is_active !== false);
    }

    const out: Array<{
      specific_date: string;
      start_time: string;
      end_time: string;
      is_active: boolean;
      /** Bekleyen veya onaylı talep var (hoca: slot müdahalesi engeli) */
      is_booked: boolean;
      /** Yalnızca onaylı randevu (öğrenci: slotta tam doluluk) */
      is_slot_locked: boolean;
      student_name?: string | null;
      student_surname?: string | null;
      appointment_status?: string | null;
    }> = [];

    for (const iso of eachWeekdayBetween(fromIso, toIso)) {
      const ip = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const dow = ip
        ? new Date(Date.UTC(Number(ip[1]), Number(ip[2]) - 1, Number(ip[3]), 12, 0, 0)).getUTCDay()
        : new Date(`${iso}T12:00:00Z`).getUTCDay();
      for (const [slotStart, slotEnd] of APPOINTMENT_TIME_SLOTS) {
        const sk = slotGridKey(slotStart, slotEnd);
        const dk = `${iso}|${sk}`;
        const held = heldSlotKeys.has(dk);
        const locked = lockedSlotKeys.has(dk);
        const detail = held ? apptBySlotKey.get(dk) : undefined;
        const dr = dateMap.get(dk);
        if (dr) {
          out.push({
            specific_date: iso,
            start_time: toClockHm(dr.start_time),
            end_time: toClockHm(dr.end_time),
            is_active: dr.is_active !== false,
            is_booked: held,
            is_slot_locked: locked,
            student_name: detail?.student_name ?? null,
            student_surname: detail?.student_surname ?? null,
            appointment_status: detail?.status ?? null,
          });
          continue;
        }
        const open = weeklyByDowSlot.get(`${dow}|${sk}`);
        if (open) {
          out.push({
            specific_date: iso,
            start_time: slotStart,
            end_time: slotEnd,
            is_active: true,
            is_booked: held,
            is_slot_locked: locked,
            student_name: detail?.student_name ?? null,
            student_surname: detail?.student_surname ?? null,
            appointment_status: detail?.status ?? null,
          });
          continue;
        }
        /**
         * Randevu kaydı var ama haftalık şablonda veya staff_availability_dates’te bu (gün,slot)
         * yoksa eski davranışta hiç satır üretilmiyordu; öğrenci grid’inde hücre boş kalıyordu.
         * Hoca görünümü randevuyu weekAppointments ile gösterdiği için tutarsızdı.
         */
        if (held) {
          out.push({
            specific_date: iso,
            start_time: slotStart,
            end_time: slotEnd,
            is_active: true,
            is_booked: held,
            is_slot_locked: locked,
            student_name: detail?.student_name ?? null,
            student_surname: detail?.student_surname ?? null,
            appointment_status: detail?.status ?? null,
          });
          continue;
        }
        /**
         * Başka öğrencinin bekleyen talebi vardır; öğrenci görünümünde held false kalır.
         * Haftalık şablonda satır yoksa yine de hücre üret (boş kutu olmasın).
         */
        if (anyApptKeys.has(dk)) {
          out.push({
            specific_date: iso,
            start_time: slotStart,
            end_time: slotEnd,
            is_active: true,
            is_booked: false,
            is_slot_locked: locked,
            student_name: null,
            student_surname: null,
            appointment_status: null,
          });
        }
      }
    }

    return out;
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
    const date = normalizeCalendarDateInput(data.date);
    const startTime = data.startTime;
    const endTime = data.endTime;

    const dateOk = await queryOne<{ ok: boolean }>(
      `SELECT ($1::date >= CURRENT_DATE) AS ok`,
      [date]
    );
    if (!dateOk?.ok) {
      throw new Error('Appointment date cannot be in the past');
    }

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

    const slotApproved = await queryOne(
      `SELECT 1 FROM appointments
       WHERE staff_user_id = $1 AND appointment_date = $2::date
         AND start_time = $3::time AND end_time = $4::time
         AND status = 'approved'`,
      [staffUserId, date, startTime, endTime]
    );
    if (slotApproved) {
      throw new Error('This time slot is already booked');
    }

    const ownPending = await queryOne(
      `SELECT 1 FROM appointments
       WHERE staff_user_id = $1 AND student_user_id = $2 AND appointment_date = $3::date
         AND start_time = $4::time AND end_time = $5::time
         AND status = 'pending'`,
      [staffUserId, studentUserId, date, startTime, endTime]
    );
    if (ownPending) {
      throw new Error('You already have a pending request for this time slot');
    }

    const appointment = await transaction(async (client) => {
      const appointmentRes = await client.query(
        `INSERT INTO appointments
          (staff_user_id, student_user_id, appointment_date, start_time, end_time, topic, notes)
         VALUES ($1, $2, $3::date, $4::time, $5::time, $6, $7)
         RETURNING appointment_id, staff_user_id, student_user_id, appointment_date::text AS appointment_date, start_time::text, end_time::text, status`,
        [staffUserId, studentUserId, date, startTime, endTime, data.topic || null, data.notes || null]
      );

      return appointmentRes.rows[0];
    });

    await NotificationEmitterService.createSafe({
      recipientUserId: staffUserId,
      actorUserId: studentUserId,
      sourceModule: 'academic',
      kind: 'academic.appointment_request',
      message: `New appointment request for ${appointment.appointment_date} ${appointment.start_time}-${appointment.end_time}`,
      entityType: 'appointment',
      entityId: appointment.appointment_id,
      payload: { appointmentId: appointment.appointment_id, status: appointment.status },
    });

    return appointment;
  }

  static async listAppointments(userId: number, role: string, archive: boolean) {
    /**
     * Aktif: tüm bekleyenler (tarih geçmiş olsa bile takvim + “Pending requests” ile uyumlu);
     * onaylılar yalnızca bugün ve sonrası (geçmiş onaylı arşivde).
     * Arşiv: iptal/red veya geçmişte kalmış onaylı randevular (bekleyenler arşive düşmez).
     */
    const archiveFilter = archive
      ? `(a.status IN ('cancelled', 'rejected') OR (a.appointment_date < CURRENT_DATE AND a.status = 'approved'))`
      : `(a.status = 'pending' OR (a.appointment_date >= CURRENT_DATE AND a.status = 'approved'))`;

    const roleFilter = role === 'staff'
      ? 'a.staff_user_id = $1'
      : role === 'student'
      ? 'a.student_user_id = $1'
      : '(a.staff_user_id = $1 OR a.student_user_id = $1)';

    return await query(
      `SELECT a.appointment_id, a.staff_user_id, a.student_user_id, a.appointment_date::text AS appointment_date,
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
    const appointment = await queryOne<{
      appointment_id: number;
      staff_user_id: number;
      student_user_id: number;
      appointment_date: string;
      start_time: string;
      end_time: string;
      status: string;
    }>(
      `SELECT appointment_id, staff_user_id, student_user_id,
              appointment_date::text AS appointment_date,
              start_time::text AS start_time,
              end_time::text AS end_time,
              status
       FROM appointments WHERE appointment_id = $1`,
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

    const cascadeRejectReason = 'Another request was approved for this slot.';

    const updated = await transaction(async (client) => {
      if (nextStatus === 'approved') {
        await client.query(
          `UPDATE appointments
           SET status = 'rejected',
               rejection_reason = $1
           WHERE staff_user_id = $2
             AND appointment_date = $3::date
             AND start_time = $4::time
             AND end_time = $5::time
             AND status = 'pending'
             AND appointment_id <> $6`,
          [
            cascadeRejectReason,
            appointment.staff_user_id,
            appointment.appointment_date,
            appointment.start_time,
            appointment.end_time,
            appointmentId,
          ]
        );
      }

      const updateRes = await client.query(
        `UPDATE appointments
         SET status = $1,
             rejection_reason = COALESCE($2, rejection_reason),
             cancellation_reason = COALESCE($3, cancellation_reason)
         WHERE appointment_id = $4
         RETURNING appointment_id, staff_user_id, student_user_id, appointment_date::text AS appointment_date, start_time::text, end_time::text, status, rejection_reason, cancellation_reason`,
        [nextStatus, rejectionReason, cancellationReason, appointmentId]
      );

      return updateRes.rows[0];
    });

    await NotificationEmitterService.createSafe({
      recipientUserId,
      actorUserId: userId,
      sourceModule: 'academic',
      kind: 'academic.appointment_status',
      message: `Appointment #${appointmentId} is now ${nextStatus}`,
      entityType: 'appointment',
      entityId: appointmentId,
      payload: { appointmentId, status: nextStatus },
    });

    return updated;
  }

  static async getNotifications(userId: number) {
    const rows = await query<any>(
      `
      SELECT
        notification_id,
        entity_id AS appointment_id,
        message,
        is_read,
        created_at
      FROM public.notifications
      WHERE recipient_user_id = $1
        AND source_module = 'academic'
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );
    return rows;
  }

  static async markNotificationRead(notificationId: number, userId: number) {
    await query(
      `
      UPDATE public.notifications
      SET is_read = true
      WHERE notification_id = $1 AND recipient_user_id = $2
        AND source_module = 'academic'
      `,
      [notificationId, userId]
    );
    return { success: true };
  }
}

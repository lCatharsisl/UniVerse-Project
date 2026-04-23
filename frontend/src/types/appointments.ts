/** Randevu listesi / takvim satırı (API esnek alanlar) */
export type AppointmentRow = {
  appointment_id?: number;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  student_name?: string;
  student_surname?: string;
  staff_name?: string;
  staff_surname?: string;
};

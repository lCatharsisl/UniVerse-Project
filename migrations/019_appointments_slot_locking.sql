BEGIN;

-- Allow multiple pending requests per staff slot; only one approved row per slot.
DROP INDEX IF EXISTS public.uq_appointments_active_slot;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_approved_slot
  ON public.appointments (staff_user_id, appointment_date, start_time, end_time)
  WHERE (status = 'approved');

-- Same student cannot stack duplicate pending requests for the same slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_pending_student_slot
  ON public.appointments (staff_user_id, student_user_id, appointment_date, start_time, end_time)
  WHERE (status = 'pending');

COMMIT;

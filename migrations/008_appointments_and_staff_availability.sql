BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_availability (
  availability_id serial PRIMARY KEY,
  staff_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_staff_availability_time CHECK (end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_availability_slot
  ON public.staff_availability (staff_user_id, weekday, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_weekday
  ON public.staff_availability (staff_user_id, weekday);

CREATE TABLE IF NOT EXISTS public.appointments (
  appointment_id serial PRIMARY KEY,
  staff_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  student_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  topic varchar(255),
  notes text,
  rejection_reason text,
  cancellation_reason text,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_appointments_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_staff
  ON public.appointments (staff_user_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_student
  ON public.appointments (student_user_id, appointment_date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_slot
  ON public.appointments (staff_user_id, appointment_date, start_time, end_time)
  WHERE status IN ('pending', 'approved');

CREATE TABLE IF NOT EXISTS public.appointment_notifications (
  notification_id serial PRIMARY KEY,
  appointment_id integer NOT NULL REFERENCES public.appointments(appointment_id) ON DELETE CASCADE,
  recipient_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_notifications_recipient
  ON public.appointment_notifications (recipient_user_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_availability_updated_at ON public.staff_availability;
CREATE TRIGGER trg_staff_availability_updated_at
BEFORE UPDATE ON public.staff_availability
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

COMMIT;

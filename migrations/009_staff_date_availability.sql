BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_availability_dates (
  availability_date_id serial PRIMARY KEY,
  staff_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  specific_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_staff_availability_dates_time CHECK (end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_availability_dates_slot
  ON public.staff_availability_dates (staff_user_id, specific_date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_staff_availability_dates_staff_date
  ON public.staff_availability_dates (staff_user_id, specific_date);

DROP TRIGGER IF EXISTS trg_staff_availability_dates_updated_at ON public.staff_availability_dates;
CREATE TRIGGER trg_staff_availability_dates_updated_at
BEFORE UPDATE ON public.staff_availability_dates
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

COMMIT;

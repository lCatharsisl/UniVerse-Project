-- UniVerse schema update migration
-- Bu dosya, mevcut UniVerse şemasına eklediğimiz alanları ve indexleri içerir.
-- Not: Geri alma (rollback) için ters ALTER TABLE / DROP INDEX komutlarını ayrıca tanımlayabilirsiniz.

BEGIN;

-- 1) users: profile_image_url
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_image_url character varying;

-- 2) students: current_semester, phone_number, birth_date
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS current_semester character varying(32),
  ADD COLUMN IF NOT EXISTS phone_number character varying,
  ADD COLUMN IF NOT EXISTS birth_date date;

-- 3) staff: staff_tittle -> staff_title (rename) ve yeni alanlar
-- Kolon adı gerçekten staff_tittle ise rename ediyoruz.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'staff_tittle'
  ) THEN
    ALTER TABLE public.staff
      RENAME COLUMN staff_tittle TO staff_title;
  END IF;
END $$;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS phone_number character varying,
  ADD COLUMN IF NOT EXISTS office_hours text;

-- Not: office_room_id yerine office_id kullanılacak (002_create_offices_table.sql migration'ında)

-- 4) courses: department_id (FK departments.department_id)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS department_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_course_department_id'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT fk_course_department_id
      FOREIGN KEY (department_id) REFERENCES public.departments(department_id);
  END IF;
END $$;

-- 5) lost_items & found_items zenginleştirme

-- lost_items
ALTER TABLE public.lost_items
  ADD COLUMN IF NOT EXISTS lost_by_user_id integer,
  ADD COLUMN IF NOT EXISTS location character varying,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS lost_date timestamp without time zone,
  ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS resolved_by_user_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_lost_by_user_id'
  ) THEN
    ALTER TABLE public.lost_items
      ADD CONSTRAINT fk_lost_by_user_id
      FOREIGN KEY (lost_by_user_id) REFERENCES public.users(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_lost_resolved_by_user_id'
  ) THEN
    ALTER TABLE public.lost_items
      ADD CONSTRAINT fk_lost_resolved_by_user_id
      FOREIGN KEY (resolved_by_user_id) REFERENCES public.users(user_id);
  END IF;
END $$;

-- found_items
ALTER TABLE public.found_items
  ADD COLUMN IF NOT EXISTS found_by_user_id integer,
  ADD COLUMN IF NOT EXISTS location character varying,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS found_date timestamp without time zone,
  ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS resolved_by_user_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_found_by_user_id'
  ) THEN
    ALTER TABLE public.found_items
      ADD CONSTRAINT fk_found_by_user_id
      FOREIGN KEY (found_by_user_id) REFERENCES public.users(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_found_resolved_by_user_id'
  ) THEN
    ALTER TABLE public.found_items
      ADD CONSTRAINT fk_found_resolved_by_user_id
      FOREIGN KEY (resolved_by_user_id) REFERENCES public.users(user_id);
  END IF;
END $$;

-- 6) email_verification_tokens: composite index (user_id, expires_at)
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_expires
  ON public.email_verification_tokens (user_id, expires_at);

COMMIT;



-- UniVerse offices table migration
-- Bu migration, offices tablosunu oluşturur ve staff tablosunu buna bağlar

BEGIN;

-- 1) offices tablosu oluştur
CREATE TABLE IF NOT EXISTS public.offices (
    office_id integer NOT NULL,
    room_id integer NOT NULL,
    office_name character varying NOT NULL,
    office_code character varying,
    capacity integer,
    description text,
    CONSTRAINT offices_pkey PRIMARY KEY (office_id),
    CONSTRAINT fk_office_room_id FOREIGN KEY (room_id) REFERENCES public.rooms(room_id)
);

-- 2) offices için sequence oluştur
CREATE SEQUENCE IF NOT EXISTS public.offices_office_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.offices_office_id_seq OWNED BY public.offices.office_id;

-- 3) office_id için default değer ayarla
ALTER TABLE public.offices
    ALTER COLUMN office_id SET DEFAULT nextval('public.offices_office_id_seq'::regclass);

-- 4) office_code için unique constraint (opsiyonel ama önerilir)
CREATE UNIQUE INDEX IF NOT EXISTS uq_office_code 
    ON public.offices(office_code) 
    WHERE office_code IS NOT NULL;

-- 5) room_id için unique constraint (bir room bir office olmalı)
CREATE UNIQUE INDEX IF NOT EXISTS uq_offices_room_id 
    ON public.offices(room_id);

-- 6) staff tablosundaki office_room_id kolonunu kaldır ve office_id ekle
-- Önce mevcut office_room_id varsa ve veri varsa, offices tablosuna kayıt oluştur
DO $$
DECLARE
    staff_record RECORD;
    new_office_id integer;
BEGIN
    -- Eğer staff tablosunda office_room_id kolonu varsa ve veri varsa
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'staff' 
          AND column_name = 'office_room_id'
    ) THEN
        -- Her unique office_room_id için bir office kaydı oluştur
        FOR staff_record IN 
            SELECT DISTINCT office_room_id 
            FROM public.staff 
            WHERE office_room_id IS NOT NULL
        LOOP
            -- Office kaydı oluştur (eğer yoksa)
            INSERT INTO public.offices (room_id, office_name, office_code)
            SELECT 
                staff_record.office_room_id,
                'Office ' || r.room_code,
                'OFF-' || r.room_code
            FROM public.rooms r
            WHERE r.room_id = staff_record.office_room_id
              AND NOT EXISTS (
                  SELECT 1 FROM public.offices o 
                  WHERE o.room_id = staff_record.office_room_id
              )
            ON CONFLICT (room_id) DO NOTHING;
        END LOOP;

        -- Staff kayıtlarını offices tablosuna bağla
        UPDATE public.staff s
        SET office_id = (
            SELECT o.office_id 
            FROM public.offices o 
            WHERE o.room_id = s.office_room_id 
            LIMIT 1
        )
        WHERE s.office_room_id IS NOT NULL;

        -- office_room_id kolonunu ve constraint'ini kaldır
        ALTER TABLE public.staff
            DROP CONSTRAINT IF EXISTS fk_office_room_id,
            DROP COLUMN IF EXISTS office_room_id;
    END IF;
END $$;

-- 7) staff tablosuna office_id kolonu ekle (eğer yoksa)
ALTER TABLE public.staff
    ADD COLUMN IF NOT EXISTS office_id integer;

-- 8) staff.office_id için foreign key constraint ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_staff_office_id'
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT fk_staff_office_id
      FOREIGN KEY (office_id) REFERENCES public.offices(office_id);
  END IF;
END $$;

-- 9) staff.office_id için index ekle
CREATE INDEX IF NOT EXISTS idx_staff_office_id
    ON public.staff(office_id);

COMMIT;


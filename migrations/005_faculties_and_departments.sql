-- Migration 005: Add Faculties and structured Departments

-- 1. Create Faculties Table
CREATE TABLE IF NOT EXISTS public.faculties (
    faculty_id SERIAL PRIMARY KEY,
    faculty_name VARCHAR NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Add faculty_id to departments
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS faculty_id INTEGER REFERENCES public.faculties(faculty_id);

-- 3. Clear existing departments if necessary (optional, but good for a clean sync)
-- TRUNCATE public.departments CASCADE; 

-- 4. Insert Faculties
INSERT INTO public.faculties (faculty_name) VALUES
('Mühendislik Fakültesi'),
('İşletme Fakültesi'),
('İnsan ve Toplum Bilimleri Fakültesi'),
('İletişim Fakültesi'),
('Mimarlık Fakültesi'),
('Hukuk Fakültesi'),
('Sanat ve Tasarım Fakültesi'),
('Tarım Bilimleri ve Teknolojileri Fakültesi'),
('Uygulamalı Bilimler Yüksekokulu'),
('Yabancı Diller Yüksekokulu'),
('Meslek Yüksekokulu (Önlisans)'),
('Lisansüstü Eğitim Enstitüsü')
ON CONFLICT (faculty_name) DO NOTHING;

-- 5. Insert Departments with their Faculty mapping
-- Helper function to get faculty_id by name
DO $$
DECLARE
    f_eng_id INT;
    f_bus_id INT;
    f_hum_id INT;
    f_com_id INT;
    f_arc_id INT;
    f_law_id INT;
    f_art_id INT;
    f_agr_id INT;
    f_app_id INT;
    f_lan_id INT;
    f_voc_id INT;
    f_grad_id INT;
BEGIN
    SELECT faculty_id INTO f_eng_id FROM public.faculties WHERE faculty_name = 'Mühendislik Fakültesi';
    SELECT faculty_id INTO f_bus_id FROM public.faculties WHERE faculty_name = 'İşletme Fakültesi';
    SELECT faculty_id INTO f_hum_id FROM public.faculties WHERE faculty_name = 'İnsan ve Toplum Bilimleri Fakültesi';
    SELECT faculty_id INTO f_com_id FROM public.faculties WHERE faculty_name = 'İletişim Fakültesi';
    SELECT faculty_id INTO f_arc_id FROM public.faculties WHERE faculty_name = 'Mimarlık Fakültesi';
    SELECT faculty_id INTO f_law_id FROM public.faculties WHERE faculty_name = 'Hukuk Fakültesi';
    SELECT faculty_id INTO f_art_id FROM public.faculties WHERE faculty_name = 'Sanat ve Tasarım Fakültesi';
    SELECT faculty_id INTO f_agr_id FROM public.faculties WHERE faculty_name = 'Tarım Bilimleri ve Teknolojileri Fakültesi';
    SELECT faculty_id INTO f_app_id FROM public.faculties WHERE faculty_name = 'Uygulamalı Bilimler Yüksekokulu';
    SELECT faculty_id INTO f_lan_id FROM public.faculties WHERE faculty_name = 'Yabancı Diller Yüksekokulu';
    SELECT faculty_id INTO f_voc_id FROM public.faculties WHERE faculty_name = 'Meslek Yüksekokulu (Önlisans)';
    SELECT faculty_id INTO f_grad_id FROM public.faculties WHERE faculty_name = 'Lisansüstü Eğitim Enstitüsü';

    -- Engineering
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Bilgisayar Mühendisliği', f_eng_id),
    ('Yazılım Mühendisliği', f_eng_id),
    ('Elektrik-Elektronik Mühendisliği', f_eng_id),
    ('Endüstri Mühendisliği', f_eng_id),
    ('Enerji Sistemleri Mühendisliği', f_eng_id),
    ('İnşaat Mühendisliği', f_eng_id),
    ('Makine Mühendisliği', f_eng_id)
    ON CONFLICT DO NOTHING;

    -- Business
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Ekonomi', f_bus_id),
    ('İşletme', f_bus_id),
    ('Lojistik Yönetimi', f_bus_id),
    ('Uluslararası Ticaret ve Finansman', f_bus_id)
    ON CONFLICT DO NOTHING;

    -- Humanities
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Psikoloji', f_hum_id),
    ('Sosyoloji', f_hum_id),
    ('Uluslararası İlişkiler', f_hum_id),
    ('İngiliz Dili ve Edebiyatı', f_hum_id),
    ('İngilizce Mütercim ve Tercümanlık', f_hum_id)
    ON CONFLICT DO NOTHING;

    -- Communication
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Görsel İletişim Tasarımı', f_com_id),
    ('Halkla İlişkiler ve Reklamcılık', f_com_id),
    ('Radyo, Televizyon ve Sinema', f_com_id),
    ('Yeni Medya ve İletişim', f_com_id)
    ON CONFLICT DO NOTHING;

    -- Architecture
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Mimarlık', f_arc_id),
    ('İç Mimarlık ve Çevre Tasarımı', f_arc_id)
    ON CONFLICT DO NOTHING;

    -- Law
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Hukuk', f_law_id)
    ON CONFLICT DO NOTHING;

    -- Art & Design
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Çizgi Film ve Animasyon', f_art_id),
    ('Endüstriyel Tasarım', f_art_id),
    ('Grafik Tasarımı (Lisans)', f_art_id),
    ('Müzik', f_art_id)
    ON CONFLICT DO NOTHING;

    -- Agriculture
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Tarım Ekonomisi', f_agr_id),
    ('Tarım Makineleri ve Teknolojileri Mühendisliği', f_agr_id)
    ON CONFLICT DO NOTHING;

    -- Applied Sciences
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Gastronomi ve Mutfak Sanatları', f_app_id),
    ('Turizm Rehberliği', f_app_id),
    ('Yönetim Bilişim Sistemleri (MIS)', f_app_id)
    ON CONFLICT DO NOTHING;

    -- Languages
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('İngilizce Hazırlık Sınıfı', f_lan_id)
    ON CONFLICT DO NOTHING;

    -- Vocational
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Bilgisayar Programcılığı', f_voc_id),
    ('Bilgisayar Destekli Tasarım ve Animasyon', f_voc_id),
    ('Grafik Tasarımı (Önlisans)', f_voc_id),
    ('Mimari Restorasyon', f_voc_id),
    ('Gıda Teknolojisi', f_voc_id),
    ('İş Sağlığı ve Güvenliği', f_voc_id),
    ('Bankacılık ve Sigortacılık', f_voc_id),
    ('Dış Ticaret', f_voc_id),
    ('Lojistik', f_voc_id),
    ('Halkla İlişkiler ve Tanıtım', f_voc_id),
    ('Turizm ve Otel İşletmeciliği', f_voc_id),
    ('Deniz ve Liman İşletmeciliği', f_voc_id),
    ('Marina ve Yat İşletmeciliği', f_voc_id)
    ON CONFLICT DO NOTHING;

    -- Graduate
    INSERT INTO public.departments (department_name, faculty_id) VALUES
    ('Lisansüstü Eğitim Programları (Yüksek Lisans ve Doktora)', f_grad_id)
    ON CONFLICT DO NOTHING;
END $$;

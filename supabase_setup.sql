-- UniVerse Database Setup for Supabase
-- Run this script in the Supabase SQL Editor

-- =====================================================
-- 1. CORE TABLES (No dependencies)
-- =====================================================

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR NOT NULL
);

-- Buildings
CREATE TABLE IF NOT EXISTS public.buildings (
    building_id SERIAL PRIMARY KEY,
    building_name VARCHAR NOT NULL
);

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR NOT NULL,
    course_code VARCHAR NOT NULL,
    department_id INTEGER REFERENCES public.departments(department_id)
);

-- Users
CREATE TABLE IF NOT EXISTS public.users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('student', 'staff', 'admin', 'community')),
    is_email_verified BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    profile_image_url VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================
-- 2. LOCATION TABLES (Depend on buildings)
-- =====================================================

-- Floors
CREATE TABLE IF NOT EXISTS public.floors (
    floor_id SERIAL PRIMARY KEY,
    floor_number INTEGER NOT NULL,
    building_id INTEGER NOT NULL REFERENCES public.buildings(building_id)
);

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
    room_id SERIAL PRIMARY KEY,
    room_code VARCHAR NOT NULL,
    floor_id INTEGER NOT NULL REFERENCES public.floors(floor_id),
    capacity INTEGER
);

-- Offices
CREATE TABLE IF NOT EXISTS public.offices (
    office_id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES public.rooms(room_id),
    office_name VARCHAR NOT NULL,
    office_code VARCHAR,
    capacity INTEGER,
    description TEXT
);

-- =====================================================
-- 3. USER ROLE TABLES (Depend on users, departments)
-- =====================================================

-- Students
CREATE TABLE IF NOT EXISTS public.students (
    student_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id),
    student_number VARCHAR NOT NULL,
    student_name VARCHAR NOT NULL,
    student_surname VARCHAR NOT NULL,
    department_id INTEGER NOT NULL REFERENCES public.departments(department_id),
    current_semester VARCHAR(32),
    phone_number VARCHAR,
    birth_date DATE
);

-- Staff
CREATE TABLE IF NOT EXISTS public.staff (
    staff_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id),
    staff_name VARCHAR NOT NULL,
    staff_surname VARCHAR NOT NULL,
    department_id INTEGER NOT NULL REFERENCES public.departments(department_id),
    staff_title VARCHAR,
    phone_number VARCHAR,
    office_id INTEGER REFERENCES public.offices(office_id),
    office_hours TEXT
);

-- Admins
CREATE TABLE IF NOT EXISTS public.admins (
    admin_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id),
    admin_name VARCHAR NOT NULL,
    admin_surname VARCHAR NOT NULL
);

-- Communities
CREATE TABLE IF NOT EXISTS public.communities (
    community_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    community_name VARCHAR NOT NULL,
    description TEXT,
    contact_email VARCHAR
);

-- =====================================================
-- 4. SESSION & VERIFICATION TABLES
-- =====================================================

-- User Sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id),
    session_token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Email Verification Tokens
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    email_token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id),
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false NOT NULL
);

-- =====================================================
-- 5. SCHEDULE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.schedule (
    schedule_id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES public.rooms(room_id),
    course_id INTEGER NOT NULL REFERENCES public.courses(course_id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    section INTEGER NOT NULL,
    CONSTRAINT ck_start_end_time CHECK (start_time < end_time)
);

-- =====================================================
-- 6. LOST & FOUND TABLES
-- =====================================================

-- Lost Items
CREATE TABLE IF NOT EXISTS public.lost_items (
    lost_item_id SERIAL PRIMARY KEY,
    lost_item_name VARCHAR NOT NULL,
    user_id INTEGER REFERENCES public.users(user_id),
    location VARCHAR,
    description TEXT,
    lost_date TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMP
);

-- Found Items
CREATE TABLE IF NOT EXISTS public.found_items (
    found_item_id SERIAL PRIMARY KEY,
    found_item_name VARCHAR NOT NULL,
    user_id INTEGER REFERENCES public.users(user_id),
    location VARCHAR,
    description TEXT,
    found_date TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMP
);

-- Lost Item Images
CREATE TABLE IF NOT EXISTS public.lost_item_images (
    image_id SERIAL PRIMARY KEY,
    lost_item_id INTEGER NOT NULL REFERENCES public.lost_items(lost_item_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Found Item Images
CREATE TABLE IF NOT EXISTS public.found_item_images (
    image_id SERIAL PRIMARY KEY,
    found_item_id INTEGER NOT NULL REFERENCES public.found_items(found_item_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item Comments
CREATE TABLE IF NOT EXISTS public.item_comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_type VARCHAR NOT NULL CHECK (item_type IN ('lost', 'found')),
    item_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_expires
    ON public.email_verification_tokens (user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_staff_office_id
    ON public.staff(office_id);

-- =====================================================
-- 8. VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.view_floors AS
SELECT 
    f.floor_id,
    f.floor_number,
    b.building_name
FROM public.floors f
JOIN public.buildings b ON f.building_id = b.building_id
ORDER BY b.building_name, f.floor_number;

-- =====================================================
-- 9. SEED DATA (Initial required data)
-- =====================================================

INSERT INTO public.departments (department_name) VALUES
    ('Computer Engineering'),
    ('Electrical Engineering'),
    ('Mechanical Engineering'),
    ('Civil Engineering'),
    ('Industrial Engineering'),
    ('Software Engineering'),
    ('Business Administration'),
    ('Economics'),
    ('Law'),
    ('Psychology')
ON CONFLICT DO NOTHING;

INSERT INTO public.buildings (building_name) VALUES
    ('Engineering Building'),
    ('Business Building'),
    ('Law Building'),
    ('Library'),
    ('Student Center')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

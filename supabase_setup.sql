-- UniVerse Database Setup for Supabase
-- Run this script in the Supabase SQL Editor
-- AK-33: Comprehensive Database Structure & Relations Improvements

-- =====================================================
-- 0. ENUM TYPES
-- =====================================================

-- User Role Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin', 'community');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 1. CORE TABLES (No dependencies)
-- =====================================================

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (\n    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Buildings
CREATE TABLE IF NOT EXISTS public.buildings (
    building_id SERIAL PRIMARY KEY,
    building_name VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR NOT NULL,
    course_code VARCHAR NOT NULL,
    department_id INTEGER REFERENCES public.departments(department_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Users
CREATE TABLE IF NOT EXISTS public.users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    is_email_verified BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    profile_image_url VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL
);

-- =====================================================
-- 2. LOCATION TABLES (Depend on buildings)
-- =====================================================

-- Floors
CREATE TABLE IF NOT EXISTS public.floors (
    floor_id SERIAL PRIMARY KEY,
    floor_number INTEGER NOT NULL,
    building_id INTEGER NOT NULL REFERENCES public.buildings(building_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
    room_id SERIAL PRIMARY KEY,
    room_code VARCHAR NOT NULL,
    floor_id INTEGER NOT NULL REFERENCES public.floors(floor_id),
    capacity INTEGER CHECK (capacity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Offices
CREATE TABLE IF NOT EXISTS public.offices (
    office_id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES public.rooms(room_id),
    office_name VARCHAR NOT NULL,
    office_code VARCHAR,
    capacity INTEGER CHECK (capacity > 0),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================
-- 3. USER ROLE TABLES (Depend on users, departments)
-- =====================================================

-- Students
CREATE TABLE IF NOT EXISTS public.students (
    student_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    student_number VARCHAR NOT NULL,
    student_name VARCHAR NOT NULL,
    student_surname VARCHAR NOT NULL,
    department_id INTEGER NOT NULL REFERENCES public.departments(department_id),
    current_semester VARCHAR(32),
    phone_number VARCHAR,
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_students_user_id UNIQUE (user_id),
    CONSTRAINT uq_students_number UNIQUE (student_number)
);

-- Staff
CREATE TABLE IF NOT EXISTS public.staff (
    staff_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    staff_name VARCHAR NOT NULL,
    staff_surname VARCHAR NOT NULL,
    department_id INTEGER NOT NULL REFERENCES public.departments(department_id),
    staff_title VARCHAR,
    phone_number VARCHAR,
    office_id INTEGER REFERENCES public.offices(office_id),
    office_hours TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_staff_user_id UNIQUE (user_id)
);

-- Admins
CREATE TABLE IF NOT EXISTS public.admins (
    admin_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    admin_name VARCHAR NOT NULL,
    admin_surname VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_admins_user_id UNIQUE (user_id)
);

-- Communities
CREATE TABLE IF NOT EXISTS public.communities (
    community_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    community_name VARCHAR NOT NULL,
    description TEXT,
    contact_email VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_communities_user_id UNIQUE (user_id)
);

-- =====================================================
-- 4. SESSION & VERIFICATION TABLES
-- =====================================================

-- User Sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Email Verification Tokens
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    email_token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    CONSTRAINT ck_start_end_time CHECK (start_time < end_time),
    CONSTRAINT uq_schedule_room_day_time UNIQUE (room_id, day_of_week, start_time)
);

-- =====================================================
-- 6. LOST & FOUND TABLES
-- =====================================================

-- Lost Items
CREATE TABLE IF NOT EXISTS public.lost_items (
    lost_item_id SERIAL PRIMARY KEY,
    lost_item_name VARCHAR NOT NULL,
    user_id INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    location VARCHAR,
    description TEXT,
    lost_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    CHECK (lost_date IS NULL OR lost_date <= CURRENT_TIMESTAMP)
);

-- Found Items
CREATE TABLE IF NOT EXISTS public.found_items (
    found_item_id SERIAL PRIMARY KEY,
    found_item_name VARCHAR NOT NULL,
    user_id INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    location VARCHAR,
    description TEXT,
    found_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    CHECK (found_date IS NULL OR found_date <= CURRENT_TIMESTAMP)
);

-- Lost Item Images
CREATE TABLE IF NOT EXISTS public.lost_item_images (
    image_id SERIAL PRIMARY KEY,
    lost_item_id INTEGER NOT NULL REFERENCES public.lost_items(lost_item_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Found Item Images
CREATE TABLE IF NOT EXISTS public.found_item_images (
    image_id SERIAL PRIMARY KEY,
    found_item_id INTEGER NOT NULL REFERENCES public.found_items(found_item_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Item Comments
CREATE TABLE IF NOT EXISTS public.item_comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_type VARCHAR NOT NULL CHECK (item_type IN ('lost', 'found')),
    item_id INTEGER NOT NULL, -- Polymorphic FK: references lost_item_id or found_item_id based on item_type
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =====================================================
-- 7. INDEXES
-- =====================================================

-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_expires
    ON public.email_verification_tokens (user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_staff_office_id
    ON public.staff(office_id);

-- AK-33: Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email
    ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_lost_items_location
    ON public.lost_items(location);

CREATE INDEX IF NOT EXISTS idx_found_items_location
    ON public.found_items(location);

CREATE INDEX IF NOT EXISTS idx_lost_items_resolved
    ON public.lost_items(is_resolved);

CREATE INDEX IF NOT EXISTS idx_found_items_resolved
    ON public.found_items(is_resolved);

CREATE INDEX IF NOT EXISTS idx_lost_items_date
    ON public.lost_items(lost_date);

CREATE INDEX IF NOT EXISTS idx_found_items_date
    ON public.found_items(found_date);

CREATE INDEX IF NOT EXISTS idx_lost_items_user_id
    ON public.lost_items(user_id);

CREATE INDEX IF NOT EXISTS idx_found_items_user_id
    ON public.found_items(user_id);

CREATE INDEX IF NOT EXISTS idx_schedule_room_day
    ON public.schedule(room_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token
    ON public.user_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_item_comments_type_item
    ON public.item_comments(item_type, item_id);

-- =====================================================
-- 8. TRIGGERS (Auto update_at)
-- =====================================================

-- Trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_departments_timestamp
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_buildings_timestamp
    BEFORE UPDATE ON public.buildings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_courses_timestamp
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_floors_timestamp
    BEFORE UPDATE ON public.floors
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_rooms_timestamp
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_offices_timestamp
    BEFORE UPDATE ON public.offices
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_students_timestamp
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_staff_timestamp
    BEFORE UPDATE ON public.staff
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_admins_timestamp
    BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_communities_timestamp
    BEFORE UPDATE ON public.communities
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_schedule_timestamp
    BEFORE UPDATE ON public.schedule
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_lost_items_timestamp
    BEFORE UPDATE ON public.lost_items
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_found_items_timestamp
    BEFORE UPDATE ON public.found_items
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- 9. VIEWS
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
-- 10. SEED DATA (Initial required data)
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

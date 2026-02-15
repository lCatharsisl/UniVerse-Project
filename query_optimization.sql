-- UniVerse Query Optimization Script
-- AK-34: Database Query Optimization
-- Run this script after supabase_setup.sql

-- =====================================================
-- 1. MATERIALIZED VIEWS
-- =====================================================

-- Dashboard Statistics View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT 
    COUNT(DISTINCT user_id) FILTER (WHERE role = 'student') as total_students,
    COUNT(DISTINCT user_id) FILTER (WHERE role = 'staff') as total_staff,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_users,
    (SELECT COUNT(*) FROM lost_items WHERE is_resolved = false AND deleted_at IS NULL) as active_lost_items,
    (SELECT COUNT(*) FROM found_items WHERE is_resolved = false AND deleted_at IS NULL) as active_found_items,
    CURRENT_TIMESTAMP as last_refreshed
FROM users
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats ON mv_dashboard_stats ((1));

-- Active Lost Items with User Info
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_lost_items AS
SELECT 
    li.lost_item_id,
    li.lost_item_name,
    li.location,
    li.description,
    li.lost_date,
    u.email as poster_email,
    u.user_id as poster_id,
    COUNT(DISTINCT lic.comment_id) as comment_count,
    COUNT(DISTINCT lii.image_id) as image_count,
    li.created_at
FROM lost_items li
LEFT JOIN users u ON li.user_id = u.user_id
LEFT JOIN item_comments lic ON lic.item_id = li.lost_item_id AND lic.item_type = 'lost'
LEFT JOIN lost_item_images lii ON lii.lost_item_id = li.lost_item_id
WHERE li.is_resolved = false AND li.deleted_at IS NULL
GROUP BY li.lost_item_id, u.email, u.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_active_lost_items ON mv_active_lost_items (lost_item_id);

-- Active Found Items with User Info
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_found_items AS
SELECT 
    fi.found_item_id,
    fi.found_item_name,
    fi.location,
    fi.description,
    fi.found_date,
    u.email as poster_email,
    u.user_id as poster_id,
    COUNT(DISTINCT fic.comment_id) as comment_count,
    COUNT(DISTINCT fii.image_id) as image_count,
    fi.created_at
FROM found_items fi
LEFT JOIN users u ON fi.user_id = u.user_id
LEFT JOIN item_comments fic ON fic.item_id = fi.found_item_id AND fic.item_type = 'found'
LEFT JOIN found_item_images fii ON fii.found_item_id = fi.found_item_id
WHERE fi.is_resolved = false AND fi.deleted_at IS NULL
GROUP BY fi.found_item_id, u.email, u.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_active_found_items ON mv_active_found_items (found_item_id);

-- Room Schedule Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_room_schedule_summary AS
SELECT 
    r.room_id,
    r.room_code,
    COUNT(DISTINCT s.schedule_id) as total_classes,
    COUNT(DISTINCT s.course_id) as unique_courses,
    json_agg(
        json_build_object(
            'day', s.day_of_week,
            'start_time', s.start_time,
            'end_time', s.end_time,
            'course_id', s.course_id
        ) ORDER BY s.day_of_week, s.start_time
    ) as schedule_details
FROM rooms r
LEFT JOIN schedule s ON s.room_id = r.room_id AND s.deleted_at IS NULL
GROUP BY r.room_id, r.room_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_room_schedule_summary ON mv_room_schedule_summary (room_id);

-- =====================================================
-- 2. COMPOSITE INDEXES
-- =====================================================

-- Schedule search: by room and day
CREATE INDEX IF NOT EXISTS idx_schedule_room_day_time 
ON schedule(room_id, day_of_week, start_time)
WHERE deleted_at IS NULL;

-- Lost items: by status and date
CREATE INDEX IF NOT EXISTS idx_lost_items_status_date 
ON lost_items(is_resolved, lost_date DESC)
WHERE deleted_at IS NULL;

-- Found items: by status and date
CREATE INDEX IF NOT EXISTS idx_found_items_status_date 
ON found_items(is_resolved, found_date DESC)
WHERE deleted_at IS NULL;

-- User search: by role and active status
CREATE INDEX IF NOT EXISTS idx_users_role_active 
ON users(role, is_active)
WHERE deleted_at IS NULL;

-- Comments: by item type, item id, and date
CREATE INDEX IF NOT EXISTS idx_comments_type_item_date 
ON item_comments(item_type, item_id, created_at DESC);

-- Student department lookup
CREATE INDEX IF NOT EXISTS idx_students_dept_semester 
ON students(department_id, current_semester);

-- Staff department and office
CREATE INDEX IF NOT EXISTS idx_staff_dept_office 
ON staff(department_id, office_id);

-- =====================================================
-- 3. PARTIAL INDEXES
-- =====================================================

-- Only active (non-deleted) users
CREATE INDEX IF NOT EXISTS idx_users_active_only 
ON users(user_id, email)
WHERE deleted_at IS NULL AND is_active = true;

-- Only unresolved lost items
CREATE INDEX IF NOT EXISTS idx_lost_items_unresolved_only 
ON lost_items(lost_date DESC, location)
WHERE is_resolved = false AND deleted_at IS NULL;

-- Only unresolved found items
CREATE INDEX IF NOT EXISTS idx_found_items_unresolved_only 
ON found_items(found_date DESC, location)
WHERE is_resolved = false AND deleted_at IS NULL;

-- Only active schedules
CREATE INDEX IF NOT EXISTS idx_schedule_active_only 
ON schedule(room_id, day_of_week, start_time)
WHERE deleted_at IS NULL;

-- Recent lost items (last 30 days)
CREATE INDEX IF NOT EXISTS idx_lost_items_recent 
ON lost_items(lost_date DESC)
WHERE lost_date > CURRENT_TIMESTAMP - INTERVAL '30 days' AND deleted_at IS NULL;

-- Recent found items (last 30 days)
CREATE INDEX IF NOT EXISTS idx_found_items_recent 
ON found_items(found_date DESC)
WHERE found_date > CURRENT_TIMESTAMP - INTERVAL '30 days' AND deleted_at IS NULL;

-- Verified users only
CREATE INDEX IF NOT EXISTS idx_users_verified 
ON users(user_id, role)
WHERE is_email_verified = true AND deleted_at IS NULL;

-- =====================================================
-- 4. FULL-TEXT SEARCH
-- =====================================================

-- Lost items full-text search
CREATE INDEX IF NOT EXISTS idx_lost_items_fts 
ON lost_items USING GIN (
    to_tsvector('english', 
        COALESCE(lost_item_name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(location, '')
    )
);

-- Found items full-text search
CREATE INDEX IF NOT EXISTS idx_found_items_fts 
ON found_items USING GIN (
    to_tsvector('english', 
        COALESCE(found_item_name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(location, '')
    )
);

-- Search function for lost items
CREATE OR REPLACE FUNCTION search_lost_items(search_term TEXT)
RETURNS TABLE (
    lost_item_id INTEGER,
    lost_item_name VARCHAR,
    location VARCHAR,
    description TEXT,
    lost_date TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        li.lost_item_id,
        li.lost_item_name,
        li.location,
        li.description,
        li.lost_date,
        ts_rank(
            to_tsvector('english', 
                COALESCE(li.lost_item_name, '') || ' ' || 
                COALESCE(li.description, '') || ' ' || 
                COALESCE(li.location, '')
            ), 
            plainto_tsquery('english', search_term)
        ) as rank
    FROM lost_items li
    WHERE 
        li.deleted_at IS NULL AND
        to_tsvector('english', 
            COALESCE(li.lost_item_name, '') || ' ' || 
            COALESCE(li.description, '') || ' ' || 
            COALESCE(li.location, '')
        ) @@ plainto_tsquery('english', search_term)
    ORDER BY rank DESC, li.lost_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Search function for found items
CREATE OR REPLACE FUNCTION search_found_items(search_term TEXT)
RETURNS TABLE (
    found_item_id INTEGER,
    found_item_name VARCHAR,
    location VARCHAR,
    description TEXT,
    found_date TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.found_item_id,
        fi.found_item_name,
        fi.location,
        fi.description,
        fi.found_date,
        ts_rank(
            to_tsvector('english', 
                COALESCE(fi.found_item_name, '') || ' ' || 
                COALESCE(fi.description, '') || ' ' || 
                COALESCE(fi.location, '')
            ), 
            plainto_tsquery('english', search_term)
        ) as rank
    FROM found_items fi
    WHERE 
        fi.deleted_at IS NULL AND
        to_tsvector('english', 
            COALESCE(fi.found_item_name, '') || ' ' || 
            COALESCE(fi.description, '') || ' ' || 
            COALESCE(fi.location, '')
        ) @@ plainto_tsquery('english', search_term)
    ORDER BY rank DESC, fi.found_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 5. QUERY REWRITE & OPTIMIZATION
-- =====================================================

-- Get user with complete role information
CREATE OR REPLACE FUNCTION get_user_with_role(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_role_type user_role;
BEGIN
    SELECT role INTO user_role_type FROM users WHERE user_id = p_user_id;
    
    SELECT json_build_object(
        'user_id', u.user_id,
        'email', u.email,
        'role', u.role,
        'is_email_verified', u.is_email_verified,
        'is_active', u.is_active,
        'profile_image_url', u.profile_image_url,
        'created_at', u.created_at,
        'student_info', CASE WHEN u.role = 'student' 
            THEN (SELECT row_to_json(s.*) FROM students s WHERE s.user_id = u.user_id)
            ELSE NULL END,
        'staff_info', CASE WHEN u.role = 'staff' 
            THEN (SELECT row_to_json(st.*) FROM staff st WHERE st.user_id = u.user_id)
            ELSE NULL END,
        'admin_info', CASE WHEN u.role = 'admin' 
            THEN (SELECT row_to_json(a.*) FROM admins a WHERE a.user_id = u.user_id)
            ELSE NULL END,
        'community_info', CASE WHEN u.role = 'community' 
            THEN (SELECT row_to_json(c.*) FROM communities c WHERE c.user_id = u.user_id)
            ELSE NULL END
    ) INTO result
    FROM users u
    WHERE u.user_id = p_user_id AND u.deleted_at IS NULL;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get room schedule for a specific day
CREATE OR REPLACE FUNCTION get_room_schedule_by_day(p_room_id INTEGER, p_day INTEGER)
RETURNS TABLE (
    schedule_id INTEGER,
    course_name VARCHAR,
    course_code VARCHAR,
    start_time TIME,
    end_time TIME,
    section INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schedule_id,
        c.course_name,
        c.course_code,
        s.start_time,
        s.end_time,
        s.section
    FROM schedule s
    JOIN courses c ON c.course_id = s.course_id
    WHERE 
        s.room_id = p_room_id AND 
        s.day_of_week = p_day AND 
        s.deleted_at IS NULL
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get item with all details (images and comments)
CREATE OR REPLACE FUNCTION get_lost_item_details(p_item_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'item', row_to_json(li.*),
        'poster', (SELECT json_build_object('user_id', u.user_id, 'email', u.email) 
                   FROM users u WHERE u.user_id = li.user_id),
        'images', (SELECT json_agg(row_to_json(lii.*)) FROM lost_item_images lii 
                   WHERE lii.lost_item_id = p_item_id),
        'comments', (SELECT json_agg(
                        json_build_object(
                            'comment', row_to_json(ic.*),
                            'user', (SELECT json_build_object('user_id', u.user_id, 'email', u.email) 
                                     FROM users u WHERE u.user_id = ic.user_id)
                        ) ORDER BY ic.created_at DESC
                     ) FROM item_comments ic 
                     WHERE ic.item_id = p_item_id AND ic.item_type = 'lost')
    ) INTO result
    FROM lost_items li
    WHERE li.lost_item_id = p_item_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 6. STATISTICS & ANALYSIS
-- =====================================================

-- Auto-analyze trigger function
CREATE OR REPLACE FUNCTION auto_analyze_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Analyze table periodically based on modification count
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND 
       pg_stat_get_live_tuples(TG_RELID) % 1000 = 0 THEN
        EXECUTE 'ANALYZE ' || TG_TABLE_NAME;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to frequently updated tables
DROP TRIGGER IF EXISTS trigger_analyze_lost_items ON lost_items;
CREATE TRIGGER trigger_analyze_lost_items
    AFTER INSERT OR UPDATE ON lost_items
    FOR EACH ROW EXECUTE FUNCTION auto_analyze_trigger();

DROP TRIGGER IF EXISTS trigger_analyze_found_items ON found_items;
CREATE TRIGGER trigger_analyze_found_items
    AFTER INSERT OR UPDATE ON found_items
    FOR EACH ROW EXECUTE FUNCTION auto_analyze_trigger();

DROP TRIGGER IF EXISTS trigger_analyze_item_comments ON item_comments;
CREATE TRIGGER trigger_analyze_item_comments
    AFTER INSERT OR UPDATE ON item_comments
    FOR EACH ROW EXECUTE FUNCTION auto_analyze_trigger();

DROP TRIGGER IF EXISTS trigger_analyze_users ON users;
CREATE TRIGGER trigger_analyze_users
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION auto_analyze_trigger();

-- =====================================================
-- 7. MAINTENANCE SCRIPTS
-- =====================================================

-- Comprehensive maintenance function
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS TABLE (
    operation VARCHAR,
    status VARCHAR,
    duration INTERVAL
) AS $$
DECLARE
    start_time TIMESTAMP;
BEGIN
    -- Vacuum analyze core tables
    start_time := clock_timestamp();
    VACUUM ANALYZE users;
    RETURN QUERY SELECT 'VACUUM users'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    start_time := clock_timestamp();
    VACUUM ANALYZE lost_items;
    RETURN QUERY SELECT 'VACUUM lost_items'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    start_time := clock_timestamp();
    VACUUM ANALYZE found_items;
    RETURN QUERY SELECT 'VACUUM found_items'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    start_time := clock_timestamp();
    VACUUM ANALYZE schedule;
    RETURN QUERY SELECT 'VACUUM schedule'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    -- Refresh materialized views
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
    RETURN QUERY SELECT 'REFRESH mv_dashboard_stats'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_lost_items;
    RETURN QUERY SELECT 'REFRESH mv_active_lost_items'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_found_items;
    RETURN QUERY SELECT 'REFRESH mv_active_found_items'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_room_schedule_summary;
    RETURN QUERY SELECT 'REFRESH mv_room_schedule_summary'::VARCHAR, 'completed'::VARCHAR, clock_timestamp() - start_time;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Quick maintenance (for more frequent runs)
CREATE OR REPLACE FUNCTION perform_quick_maintenance()
RETURNS void AS $$
BEGIN
    -- Just refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_lost_items;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_found_items;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_room_schedule_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. HELPER VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active users with role details
CREATE OR REPLACE VIEW view_active_users_with_roles AS
SELECT 
    u.user_id,
    u.email,
    u.role,
    u.is_email_verified,
    u.created_at,
    CASE 
        WHEN u.role = 'student' THEN s.student_name || ' ' || s.student_surname
        WHEN u.role = 'staff' THEN st.staff_name || ' ' || st.staff_surname
        WHEN u.role = 'admin' THEN a.admin_name || ' ' || a.admin_surname
        WHEN u.role = 'community' THEN c.community_name
        ELSE NULL
    END as full_name,
    CASE
        WHEN u.role = 'student' THEN s.department_id
        WHEN u.role = 'staff' THEN st.department_id
        ELSE NULL
    END as department_id
FROM users u
LEFT JOIN students s ON s.user_id = u.user_id
LEFT JOIN staff st ON st.user_id = u.user_id
LEFT JOIN admins a ON a.user_id = u.user_id
LEFT JOIN communities c ON c.user_id = u.user_id
WHERE u.deleted_at IS NULL AND u.is_active = true;

-- =====================================================
-- INITIAL ANALYSIS
-- =====================================================

-- Run initial analyze on all tables
ANALYZE users;
ANALYZE students;
ANALYZE staff;
ANALYZE admins;
ANALYZE communities;
ANALYZE lost_items;
ANALYZE found_items;
ANALYZE item_comments;
ANALYZE schedule;
ANALYZE rooms;
ANALYZE offices;

-- Refresh materialized views
REFRESH MATERIALIZED VIEW mv_dashboard_stats;
REFRESH MATERIALIZED VIEW mv_active_lost_items;
REFRESH MATERIALIZED VIEW mv_active_found_items;
REFRESH MATERIALIZED VIEW mv_room_schedule_summary;

-- =====================================================
-- QUERY OPTIMIZATION COMPLETE
-- =====================================================

-- Profile Enhancements Migration
-- Adds: social_links, interests (tagged fields), muted_words, is_private,
--        session metadata for Active Sessions, and blocked_users table.
-- Run after 006_reports_and_warnings.sql

BEGIN;

-- Social links (JSONB): { linkedin, github, website, instagram }
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.staff    ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- Interest tags (text array)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE public.staff    ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

-- Phone number update (already exists on students/staff but ensure communities too)
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS phone_number character varying;

-- Muted words: feeds will hide posts containing these words
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS muted_words text[] DEFAULT '{}';

-- Private account flag: only followers see posts/bio
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Session metadata for "Active Sessions" feature
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS user_agent  text,
  ADD COLUMN IF NOT EXISTS ip_address  varchar(45),
  ADD COLUMN IF NOT EXISTS last_active_at timestamp DEFAULT NOW();

-- Blocked users list
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id          serial PRIMARY KEY,
  blocker_id  integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  blocked_id  integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  created_at  timestamp DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

COMMIT;

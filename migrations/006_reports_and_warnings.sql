-- Reports and warnings (academic moderation)
-- Run after 001–005. Uses: users(user_id), posts(post_id).

BEGIN;

-- User moderation fields
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS warning_tier smallint DEFAULT 0 CHECK (warning_tier >= 0 AND warning_tier <= 3),
  ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- Post reports: one row per (post, reporter)
CREATE TABLE IF NOT EXISTS public.post_reports (
  id serial PRIMARY KEY,
  post_id integer NOT NULL REFERENCES public.posts(post_id) ON DELETE CASCADE,
  reporter_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  report_type character varying(64) DEFAULT 'other',
  created_at timestamp without time zone DEFAULT NOW(),
  UNIQUE(post_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter ON public.post_reports(reporter_user_id);

-- User reports: one row per (reported_user, reporter)
CREATE TABLE IF NOT EXISTS public.user_reports (
  id serial PRIMARY KEY,
  reported_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  reporter_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  report_type character varying(64) DEFAULT 'other',
  created_at timestamp without time zone DEFAULT NOW(),
  UNIQUE(reported_user_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON public.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_user_id);

-- Warning history (audit)
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  tier smallint NOT NULL CHECK (tier IN (1, 2, 3, 4)),
  issued_by_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  created_at timestamp without time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON public.user_warnings(user_id);

COMMIT;

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Communities enhancements (needed by profile + fair area)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS avatar_url character varying,
  ADD COLUMN IF NOT EXISTS cover_url character varying,
  ADD COLUMN IF NOT EXISTS category_codes text[] DEFAULT '{}'::text[];

-- ─────────────────────────────────────────────────────────────────────────────
-- Community members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_members (
  membership_id serial PRIMARY KEY,
  community_id integer NOT NULL REFERENCES public.communities(community_id) ON DELETE CASCADE,
  member_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role varchar(16) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at timestamptz NOT NULL DEFAULT NOW(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (community_id, member_user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community_id
  ON public.community_members (community_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Job / Internship posts (Ilan Panosu)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_job_posts (
  job_post_id serial PRIMARY KEY,
  community_id integer NOT NULL REFERENCES public.communities(community_id) ON DELETE CASCADE,
  created_by_user_id integer REFERENCES public.users(user_id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  post_type varchar(16) NOT NULL DEFAULT 'internship' CHECK (post_type IN ('internship', 'job')),
  deadline_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_job_posts_community_id_created_at
  ON public.community_job_posts (community_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Job / Internship applications + decisions (apply/onay/red)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_job_applications (
  job_application_id serial PRIMARY KEY,
  job_post_id integer NOT NULL REFERENCES public.community_job_posts(job_post_id) ON DELETE CASCADE,
  community_id integer NOT NULL REFERENCES public.communities(community_id) ON DELETE CASCADE,
  applicant_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  phone_number varchar(32),
  cv_file_url text,
  cover_letter text,
  reason text,

  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  is_submitted boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  submitted_at timestamptz,
  decision_by_user_id integer REFERENCES public.users(user_id) ON DELETE SET NULL,
  decision_note text,

  UNIQUE (job_post_id, applicant_user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_job_apps_community_status
  ON public.community_job_applications (community_id, status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Community events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_events (
  event_id serial PRIMARY KEY,
  community_id integer NOT NULL REFERENCES public.communities(community_id) ON DELETE CASCADE,
  created_by_user_id integer REFERENCES public.users(user_id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_events_community_id_created_at
  ON public.community_events (community_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Event applications + decisions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_event_applications (
  event_application_id serial PRIMARY KEY,
  event_id integer NOT NULL REFERENCES public.community_events(event_id) ON DELETE CASCADE,
  community_id integer NOT NULL REFERENCES public.communities(community_id) ON DELETE CASCADE,
  applicant_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  phone_number varchar(32),
  cv_file_url text,
  cover_letter text,
  reason text,

  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  is_submitted boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  submitted_at timestamptz,
  decision_by_user_id integer REFERENCES public.users(user_id) ON DELETE SET NULL,
  decision_note text,

  UNIQUE (event_id, applicant_user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_event_apps_community_status
  ON public.community_event_applications (community_id, status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Community notifications
-- (used for: announcement created -> notify members, application created/decision -> notify admin/applicant)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_notifications (
  notification_id serial PRIMARY KEY,
  recipient_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  community_id integer REFERENCES public.communities(community_id) ON DELETE SET NULL,
  kind varchar(48) NOT NULL,
  title text,
  message text,
  entity_type varchar(48),
  entity_id integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_notifications_recipient_read_created
  ON public.community_notifications (recipient_user_id, is_read, created_at DESC);

COMMIT;


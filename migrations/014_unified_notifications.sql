BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Unified notifications table (covers: social, academic, community, messaging)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id serial PRIMARY KEY,
  recipient_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  actor_user_id integer REFERENCES public.users(user_id) ON DELETE SET NULL,
  community_id integer REFERENCES public.communities(community_id) ON DELETE SET NULL,
  source_module varchar(24) NOT NULL DEFAULT 'system',
  kind varchar(64) NOT NULL,
  title text,
  message text,
  entity_type varchar(64),
  entity_id integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created
  ON public.notifications (recipient_user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_user_id, created_at DESC);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS community_id integer REFERENCES public.communities(community_id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Notification preferences (simple JSON allow/deny map by kind)
-- prefs example:
--   { "social.like": true, "social.comment": true, "messaging.message": true }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id integer PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migrate existing academic appointment notifications into unified table
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.appointment_notifications') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id,
    actor_user_id,
    community_id,
    source_module,
    kind,
    title,
    message,
    entity_type,
    entity_id,
    payload,
    is_read,
    created_at
  )
  SELECT
    an.recipient_user_id,
    NULL::integer AS actor_user_id,
    NULL::integer AS community_id,
    'academic' AS source_module,
    'academic.appointment' AS kind,
    NULL::text AS title,
    an.message,
    'appointment' AS entity_type,
    an.appointment_id AS entity_id,
    '{}'::jsonb AS payload,
    an.is_read,
    an.created_at::timestamptz
  FROM public.appointment_notifications an
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.source_module = 'academic'
      AND n.kind = 'academic.appointment'
      AND n.recipient_user_id = an.recipient_user_id
      AND n.entity_type = 'appointment'
      AND n.entity_id = an.appointment_id
      AND n.created_at = an.created_at::timestamptz
      AND COALESCE(n.message, '') = COALESCE(an.message, '')
  );
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migrate existing community notifications into unified table
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.community_notifications') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id,
    actor_user_id,
    community_id,
    source_module,
    kind,
    title,
    message,
    entity_type,
    entity_id,
    payload,
    is_read,
    created_at
  )
  SELECT
    cn.recipient_user_id,
    NULL::integer AS actor_user_id,
    cn.community_id,
    'community' AS source_module,
    ('community.' || cn.kind) AS kind,
    cn.title,
    cn.message,
    cn.entity_type,
    cn.entity_id,
    COALESCE(cn.payload, '{}'::jsonb) AS payload,
    cn.is_read,
    cn.created_at::timestamptz
  FROM public.community_notifications cn
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.source_module = 'community'
      AND n.kind = ('community.' || cn.kind)
      AND n.recipient_user_id = cn.recipient_user_id
      AND COALESCE(n.entity_type, '') = COALESCE(cn.entity_type, '')
      AND COALESCE(n.entity_id, -1) = COALESCE(cn.entity_id, -1)
      AND n.created_at = cn.created_at::timestamptz
      AND COALESCE(n.title, '') = COALESCE(cn.title, '')
      AND COALESCE(n.message, '') = COALESCE(cn.message, '')
  );
END $$;

COMMIT;


BEGIN;

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS notifications_muted boolean NOT NULL DEFAULT false;

COMMIT;

BEGIN;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS shared_post_id integer REFERENCES public.posts(post_id) ON DELETE SET NULL;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'mixed', 'system', 'post_share'));

COMMIT;

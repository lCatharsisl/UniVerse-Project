BEGIN;

CREATE TABLE IF NOT EXISTS public.conversations (
  conversation_id serial PRIMARY KEY,
  is_group boolean NOT NULL DEFAULT false,
  title varchar(120),
  created_by_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  last_message_id integer,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role varchar(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  last_read_message_id integer,
  joined_at timestamp NOT NULL DEFAULT NOW(),
  left_at timestamp,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  message_id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  sender_user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  content text,
  message_type varchar(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'mixed', 'system')),
  created_at timestamp NOT NULL DEFAULT NOW(),
  edited_at timestamp,
  deleted_at timestamp
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  attachment_id serial PRIMARY KEY,
  message_id integer NOT NULL REFERENCES public.messages(message_id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type varchar(20) NOT NULL DEFAULT 'image',
  mime_type varchar(100),
  file_size integer,
  created_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_last_message'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT fk_conversations_last_message
      FOREIGN KEY (last_message_id) REFERENCES public.messages(message_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user_active
  ON public.conversation_participants (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation_active
  ON public.conversation_participants (conversation_id, is_active);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON public.messages (sender_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON public.message_attachments (message_id);

COMMIT;

BEGIN;

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_id
  ON public.conversations (last_message_id);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user_active_conversation
  ON public.conversation_participants (user_id, is_active, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_message_active
  ON public.messages (conversation_id, message_id DESC)
  WHERE deleted_at IS NULL;

COMMIT;

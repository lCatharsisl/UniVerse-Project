BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS microsoft_oid text,
  ADD COLUMN IF NOT EXISTS microsoft_tid text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_microsoft_identity
  ON public.users (microsoft_tid, microsoft_oid)
  WHERE microsoft_tid IS NOT NULL AND microsoft_oid IS NOT NULL;

COMMIT;

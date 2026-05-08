-- Optional poster image URL for community events (public storage path / URL).
BEGIN;

ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS poster_url text;

COMMIT;

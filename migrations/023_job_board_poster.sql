BEGIN;

ALTER TABLE public.community_job_posts
  ADD COLUMN IF NOT EXISTS poster_url text;

COMMIT;

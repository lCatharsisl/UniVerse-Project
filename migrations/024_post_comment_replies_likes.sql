BEGIN;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id integer REFERENCES public.post_comments(comment_id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  comment_id integer NOT NULL REFERENCES public.post_comments(comment_id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  created_at timestamp without time zone DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comments_parent_comment_id
  ON public.post_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user_id
  ON public.post_comment_likes(user_id);

COMMIT;

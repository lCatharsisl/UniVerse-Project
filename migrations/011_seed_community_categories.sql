BEGIN;

-- Seed category codes for existing sample communities (idempotent)
-- Okçuluk Kulübü => sports
UPDATE public.communities
SET category_codes = ARRAY['sports']::text[]
WHERE community_id = 3
  AND COALESCE(cardinality(category_codes), 0) = 0;

-- Sigarayı Bırakma Topluluğu => other
UPDATE public.communities
SET category_codes = ARRAY['other']::text[]
WHERE community_id = 2
  AND COALESCE(cardinality(category_codes), 0) = 0;

COMMIT;


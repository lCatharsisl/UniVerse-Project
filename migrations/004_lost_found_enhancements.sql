-- Lost Item Images
CREATE TABLE public.lost_item_images (
    image_id SERIAL PRIMARY KEY,
    lost_item_id integer NOT NULL REFERENCES public.lost_items(lost_item_id) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Found Item Images
CREATE TABLE public.found_item_images (
    image_id SERIAL PRIMARY KEY,
    found_item_id integer NOT NULL REFERENCES public.found_items(found_item_id) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Comments (Polymorphic-like association via item_type)
CREATE TABLE public.item_comments (
    comment_id SERIAL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_type character varying NOT NULL CHECK (item_type IN ('lost', 'found')),
    item_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Add resolution info to items (if not exists)
ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false;
ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS resolved_at timestamp without time zone;
ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false;
ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS resolved_at timestamp without time zone;

-- Add description, date, location to lost/found items if they are missing (based on schema review they might be missing from the CREATE TABLE in schema.sql but present in code logic/controllers? Let's double check code vs schema)
-- Looking at schema.sql offered in previous turn: 
-- CREATE TABLE public.lost_items (lost_item_id integer, lost_item_name character varying);
-- It seems the schema.sql was INCOMPLETE or OUTDATED compared to what the controller expects? 
-- The controller expects: location, description, lostDate.
-- Let's add them if they are missing.

ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS location character varying;
ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS lost_date timestamp without time zone;
ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS user_id integer REFERENCES public.users(user_id);

ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS location character varying;
ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS found_date timestamp without time zone;
ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS user_id integer REFERENCES public.users(user_id);

-- Add 'community' to roles check constraint
ALTER TABLE users DROP CONSTRAINT ck_role;
ALTER TABLE users ADD CONSTRAINT ck_role CHECK (role IN ('student', 'staff', 'admin', 'community'));

-- Create communities table
CREATE TABLE public.communities (
    community_id SERIAL PRIMARY KEY,
    user_id integer NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    community_name character varying NOT NULL,
    description text,
    contact_email character varying
);

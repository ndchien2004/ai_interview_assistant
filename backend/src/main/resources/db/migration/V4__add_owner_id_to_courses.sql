-- Add owner_id column to courses table
ALTER TABLE IF EXISTS courses ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Add foreign key constraint to users table
DO $$
BEGIN
    IF to_regclass('public.courses') IS NOT NULL THEN
        -- Add the foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'courses' AND constraint_name = 'fk_courses_owner'
        ) THEN
            ALTER TABLE courses ADD CONSTRAINT fk_courses_owner
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

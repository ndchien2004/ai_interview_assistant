ALTER TABLE course_sections
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS uk_course_sections_course_slug
    ON course_sections(course_id, slug);

ALTER TABLE practice_sessions
    ADD COLUMN IF NOT EXISTS deck_filter varchar(140);

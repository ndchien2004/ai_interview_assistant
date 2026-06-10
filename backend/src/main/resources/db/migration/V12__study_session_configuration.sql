ALTER TABLE practice_sessions
    ADD COLUMN IF NOT EXISTS question_limit integer,
    ADD COLUMN IF NOT EXISTS time_limit_seconds integer,
    ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS shuffle boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS query_filter text,
    ADD COLUMN IF NOT EXISTS difficulty_filters varchar(160),
    ADD COLUMN IF NOT EXISTS feedback_mode varchar(40) NOT NULL DEFAULT 'IMMEDIATE';

CREATE TABLE IF NOT EXISTS practice_session_questions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    question_id uuid NOT NULL,
    position integer NOT NULL,
    CONSTRAINT fk_practice_session_questions_session
        FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_practice_session_questions_question
        FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE,
    CONSTRAINT uk_practice_session_questions_session_question UNIQUE (session_id, question_id),
    CONSTRAINT uk_practice_session_questions_session_position UNIQUE (session_id, position)
);

CREATE INDEX IF NOT EXISTS idx_practice_session_questions_session_position
    ON practice_session_questions(session_id, position);

ALTER TABLE IF EXISTS interview_sessions ADD COLUMN IF NOT EXISTS mode varchar(40);
ALTER TABLE IF EXISTS interview_sessions ADD COLUMN IF NOT EXISTS domain varchar(160);

DO $$
BEGIN
    IF to_regclass('public.interview_sessions') IS NOT NULL THEN
        UPDATE interview_sessions SET mode = 'WRITTEN' WHERE mode IS NULL;
        UPDATE interview_sessions SET domain = target_role WHERE domain IS NULL OR trim(domain) = '';
    END IF;
END $$;

ALTER TABLE IF EXISTS interview_sessions ALTER COLUMN mode SET DEFAULT 'WRITTEN';
ALTER TABLE IF EXISTS interview_sessions ALTER COLUMN mode SET NOT NULL;

CREATE TABLE IF NOT EXISTS interview_session_evaluation_skills (
    session_id uuid NOT NULL,
    skill varchar(120) NOT NULL,
    CONSTRAINT fk_interview_session_evaluation_skills_session
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_transcript_messages (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL,
    role varchar(40) NOT NULL,
    content text NOT NULL,
    question_id uuid,
    sort_order integer NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    CONSTRAINT fk_interview_transcript_messages_session
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_transcript_messages_session_order
    ON interview_transcript_messages(session_id, sort_order);

-- Create practice_question_options table
CREATE TABLE IF NOT EXISTS practice_question_options (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    option_text text NOT NULL,
    option_order integer NOT NULL,
    CONSTRAINT fk_practice_question_options_question
        FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_question_options_question_order
    ON practice_question_options(question_id, option_order);

-- Create practice_question_key_points table
CREATE TABLE IF NOT EXISTS practice_question_key_points (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    key_point text NOT NULL,
    CONSTRAINT fk_practice_question_key_points_question
        FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_question_key_points_question
    ON practice_question_key_points(question_id);

-- Create practice_question_mistakes table
CREATE TABLE IF NOT EXISTS practice_question_mistakes (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    mistake text NOT NULL,
    CONSTRAINT fk_practice_question_mistakes_question
        FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_question_mistakes_question
    ON practice_question_mistakes(question_id);

-- Create practice_question_tags table
CREATE TABLE IF NOT EXISTS practice_question_tags (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    tag varchar(80) NOT NULL,
    CONSTRAINT fk_practice_question_tags_question
        FOREIGN KEY (question_id) REFERENCES practice_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_practice_question_tags_question
    ON practice_question_tags(question_id);

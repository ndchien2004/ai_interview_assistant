-- Add missing columns to practice_attempts table
ALTER TABLE IF EXISTS practice_attempts ADD COLUMN IF NOT EXISTS correct boolean;
ALTER TABLE IF EXISTS practice_attempts ADD COLUMN IF NOT EXISTS answer_text text;
ALTER TABLE IF EXISTS practice_attempts ADD COLUMN IF NOT EXISTS selected_option_index integer;
ALTER TABLE IF EXISTS practice_attempts ADD COLUMN IF NOT EXISTS time_spent_seconds integer;

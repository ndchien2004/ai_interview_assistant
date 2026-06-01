ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS headline varchar(240);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS date_of_birth_set_at timestamp(6) with time zone;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS name_change_count integer;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS name_last_changed_at timestamp(6) with time zone;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_number varchar(32);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_verified_at timestamp(6) with time zone;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS pending_phone_number varchar(32);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_otp_code_hash varchar(255);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_otp_expires_at timestamp(6) with time zone;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_otp_sent_at timestamp(6) with time zone;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_otp_attempts integer;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar_public_id varchar(360);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS auth_provider varchar(40);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_set boolean;

DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        UPDATE users SET name_change_count = 0 WHERE name_change_count IS NULL;
        UPDATE users SET phone_otp_attempts = 0 WHERE phone_otp_attempts IS NULL;
        UPDATE users SET auth_provider = 'LOCAL' WHERE auth_provider IS NULL;
        UPDATE users SET password_set = true WHERE password_set IS NULL;
    END IF;
END $$;

ALTER TABLE IF EXISTS users ALTER COLUMN name_change_count SET DEFAULT 0;
ALTER TABLE IF EXISTS users ALTER COLUMN name_change_count SET NOT NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN phone_otp_attempts SET DEFAULT 0;
ALTER TABLE IF EXISTS users ALTER COLUMN phone_otp_attempts SET NOT NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN auth_provider SET DEFAULT 'LOCAL';
ALTER TABLE IF EXISTS users ALTER COLUMN auth_provider SET NOT NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN password_set SET DEFAULT true;
ALTER TABLE IF EXISTS users ALTER COLUMN password_set SET NOT NULL;

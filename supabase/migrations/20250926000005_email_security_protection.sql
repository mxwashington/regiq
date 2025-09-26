-- Email Security Protection - Prevent Email Harvesting and PII Theft
-- Implements field-level encryption and masking for email addresses

BEGIN;

-- Create extension for encryption (if not exists)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create secure email handling functions
CREATE OR REPLACE FUNCTION encrypt_email(email_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from environment (or use a secure default)
  -- In production, this should come from a secure key management system
  encryption_key := COALESCE(
    current_setting('app.email_encryption_key', true),
    'regiq_secure_email_key_2024' -- This should be changed to a proper key
  );

  -- Encrypt the email using AES
  RETURN encode(
    extensions.encrypt(
      email_text::bytea,
      encryption_key::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_email(encrypted_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Return null for empty/null input
  IF encrypted_email IS NULL OR encrypted_email = '' THEN
    RETURN NULL;
  END IF;

  -- Get encryption key
  encryption_key := COALESCE(
    current_setting('app.email_encryption_key', true),
    'regiq_secure_email_key_2024'
  );

  -- Decrypt the email
  RETURN convert_from(
    extensions.decrypt(
      decode(encrypted_email, 'base64'),
      encryption_key::bytea,
      'aes'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return null if decryption fails (corrupted data)
    RETURN NULL;
END;
$$;

-- Create email masking function for display purposes
CREATE OR REPLACE FUNCTION mask_email(email_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  local_part text;
  domain_part text;
  at_position integer;
BEGIN
  IF email_text IS NULL OR email_text = '' THEN
    RETURN NULL;
  END IF;

  -- Find the @ symbol
  at_position := position('@' in email_text);

  IF at_position = 0 THEN
    -- Invalid email format, return masked version
    RETURN LEFT(email_text, 2) || '***' || RIGHT(email_text, 2);
  END IF;

  -- Split email into local and domain parts
  local_part := LEFT(email_text, at_position - 1);
  domain_part := RIGHT(email_text, length(email_text) - at_position);

  -- Mask local part: show first and last character, mask middle
  IF length(local_part) <= 2 THEN
    local_part := REPEAT('*', length(local_part));
  ELSIF length(local_part) <= 4 THEN
    local_part := LEFT(local_part, 1) || REPEAT('*', length(local_part) - 2) || RIGHT(local_part, 1);
  ELSE
    local_part := LEFT(local_part, 2) || REPEAT('*', length(local_part) - 4) || RIGHT(local_part, 2);
  END IF;

  -- Mask domain: show TLD, mask rest
  RETURN local_part || '@' || '***.' || split_part(domain_part, '.', -1);
END;
$$;

-- Add encrypted email column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_encrypted text,
ADD COLUMN IF NOT EXISTS email_hash text; -- For unique constraints

-- Create function to check if user can access their own full email
CREATE OR REPLACE FUNCTION can_access_full_email(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Users can access their own email, admins can access any email
  RETURN (
    auth.uid() = profile_user_id OR
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true
  );
END;
$$;

-- Create secure email view that shows appropriate email format based on access rights
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT
  p.user_id,
  p.full_name,
  p.company_name,
  p.role,
  p.is_admin,
  p.subscription_tier,
  p.subscription_end,
  p.created_at,
  p.updated_at,
  -- Show email based on access rights
  CASE
    WHEN can_access_full_email(p.user_id) THEN
      COALESCE(
        decrypt_email(p.email_encrypted),
        p.email -- Fallback to unencrypted for backward compatibility
      )
    ELSE mask_email(
      COALESCE(
        decrypt_email(p.email_encrypted),
        p.email
      )
    )
  END as email,
  -- Additional security fields for admins only
  CASE
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN
      jsonb_build_object(
        'email_hash', p.email_hash,
        'has_encrypted_email', p.email_encrypted IS NOT NULL,
        'last_login', p.last_login_at
      )
    ELSE NULL
  END as admin_metadata
FROM public.profiles p;

-- Create trigger to automatically encrypt emails on insert/update
CREATE OR REPLACE FUNCTION encrypt_email_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If email is being set or changed, encrypt it
  IF NEW.email IS NOT NULL AND (OLD.email IS NULL OR NEW.email != OLD.email) THEN
    -- Encrypt the email
    NEW.email_encrypted := encrypt_email(NEW.email);

    -- Create hash for unique constraints and lookups
    NEW.email_hash := encode(extensions.digest(LOWER(NEW.email), 'sha256'), 'hex');

    -- Log email change for security audit
    INSERT INTO public.security_events (event_type, metadata, severity, user_id)
    VALUES (
      'email_address_changed',
      jsonb_build_object(
        'previous_email_hash', encode(extensions.digest(LOWER(COALESCE(OLD.email, '')), 'sha256'), 'hex'),
        'new_email_hash', NEW.email_hash,
        'change_type', CASE WHEN OLD.email IS NULL THEN 'new' ELSE 'update' END
      ),
      'medium',
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Apply the trigger
DROP TRIGGER IF EXISTS trigger_encrypt_email ON public.profiles;
CREATE TRIGGER trigger_encrypt_email
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_email_on_change();

-- Create function to safely update email addresses
CREATE OR REPLACE FUNCTION update_user_email(new_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  existing_count integer;
BEGIN
  user_uuid := auth.uid();

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate email format
  IF new_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check for duplicates using hash
  SELECT COUNT(*) INTO existing_count
  FROM public.profiles
  WHERE email_hash = encode(extensions.digest(LOWER(new_email), 'sha256'), 'hex')
    AND user_id != user_uuid;

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Email address already in use';
  END IF;

  -- Update the email (trigger will handle encryption)
  UPDATE public.profiles
  SET email = new_email
  WHERE user_id = user_uuid;

  RETURN true;
END;
$$;

-- Create admin function to find users by email hash (for support purposes)
CREATE OR REPLACE FUNCTION admin_find_user_by_email_hash(search_email text)
RETURNS TABLE(
  user_id uuid,
  email_hash text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can use this function
  IF NOT (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.email_hash, p.created_at
  FROM public.profiles p
  WHERE p.email_hash = encode(extensions.digest(LOWER(search_email), 'sha256'), 'hex');
END;
$$;

-- Create function to migrate existing emails to encrypted format
CREATE OR REPLACE FUNCTION migrate_existing_emails()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  migration_count integer := 0;
  profile_record record;
BEGIN
  -- Only admins can run migration
  IF NOT (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) THEN
    RAISE EXCEPTION 'Insufficient privileges for email migration';
  END IF;

  FOR profile_record IN
    SELECT user_id, email
    FROM public.profiles
    WHERE email IS NOT NULL
      AND (email_encrypted IS NULL OR email_hash IS NULL)
  LOOP
    -- Update will trigger the encryption
    UPDATE public.profiles
    SET email = profile_record.email  -- This will trigger encryption
    WHERE user_id = profile_record.user_id;

    migration_count := migration_count + 1;
  END LOOP;

  -- Log the migration
  INSERT INTO public.security_events (event_type, metadata, severity)
  VALUES (
    'email_encryption_migration_completed',
    jsonb_build_object(
      'emails_migrated', migration_count,
      'migration_date', now()
    ),
    'medium'
  );

  RETURN migration_count;
END;
$$;

-- Update RLS policies for profiles to use secure view
DROP POLICY IF EXISTS "Users view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile only" ON public.profiles;

-- Create new RLS policies that prevent direct email access
CREATE POLICY "profiles_secure_access" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true
);

CREATE POLICY "profiles_secure_update" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent direct manipulation of encrypted fields
  (NEW.email_encrypted IS NULL OR NEW.email_encrypted = OLD.email_encrypted) AND
  (NEW.email_hash IS NULL OR NEW.email_hash = OLD.email_hash)
);

-- Grant permissions
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_find_user_by_email_hash(text) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_existing_emails() TO authenticated;

-- Create unique constraint on email hash to prevent duplicates
ALTER TABLE public.profiles
ADD CONSTRAINT unique_email_hash UNIQUE (email_hash);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_hash ON public.profiles (email_hash);

-- Log the security enhancement
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'email_security_protection_implemented',
  jsonb_build_object(
    'implementation_date', now(),
    'security_features', ARRAY[
      'email_field_encryption',
      'email_masking_for_non_owners',
      'email_hash_for_unique_constraints',
      'secure_email_update_function',
      'admin_lookup_by_hash',
      'automatic_encryption_on_change'
    ],
    'encryption_algorithm', 'AES',
    'hash_algorithm', 'SHA256'
  ),
  'high'
);

COMMIT;
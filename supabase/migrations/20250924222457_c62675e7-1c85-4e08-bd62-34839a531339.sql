-- Optimization: Add index for admin lookups and clarify trigger behavior

-- Add performance index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_admin_lookup 
ON profiles(user_id) 
WHERE role = 'admin' OR is_admin = true;

-- Note: log_rls_violation function exists but no trigger attached yet
-- This is intentional - it logs violations when called explicitly
-- To auto-attach to tables, uncomment the triggers below:

/*
-- Example trigger to log unauthorized access attempts (optional)
CREATE TRIGGER enforce_rls_policies_profiles
  BEFORE INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  WHEN (current_setting('hasura.user', true) IS NULL)
  EXECUTE FUNCTION log_rls_violation();
*/
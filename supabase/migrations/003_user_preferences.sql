-- User Preferences Table for Filter Persistence
-- Stores user-specific settings like alert filters, dashboard preferences, etc.

BEGIN;

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  preference_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure one preference per user per key
  CONSTRAINT unique_user_preference UNIQUE (user_id, preference_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON public.user_preferences (preference_key);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON public.user_preferences (updated_at DESC);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own preferences
CREATE POLICY "users_own_preferences" ON public.user_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Admin users can view all preferences (for support)
CREATE POLICY "admin_read_all_preferences" ON public.user_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Grant permissions
GRANT ALL ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

-- Create helper functions for easier preference management
CREATE OR REPLACE FUNCTION get_user_preference(
  p_user_id uuid,
  p_key text,
  p_default jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT preference_value INTO result
  FROM public.user_preferences
  WHERE user_id = p_user_id AND preference_key = p_key;

  RETURN COALESCE(result, p_default);
END;
$$;

CREATE OR REPLACE FUNCTION set_user_preference(
  p_user_id uuid,
  p_key text,
  p_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, preference_key, preference_value)
  VALUES (p_user_id, p_key, p_value)
  ON CONFLICT (user_id, preference_key)
  DO UPDATE SET
    preference_value = EXCLUDED.preference_value,
    updated_at = now();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_preference TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_preference TO authenticated;

-- Insert some default preference schemas for documentation
INSERT INTO public.user_preferences (user_id, preference_key, preference_value)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder user ID
  preference_key,
  default_value
FROM (
  VALUES
    ('alert_filters', '{"sources": ["FDA", "FSIS", "CDC", "EPA"], "sinceDays": 30, "minSeverity": null}'::jsonb),
    ('dashboard_layout', '{"view": "grid", "cardsPerPage": 20, "sortBy": "date_published", "sortOrder": "desc"}'::jsonb),
    ('notification_settings', '{"emailAlerts": false, "severityThreshold": 70, "sources": []}'::jsonb)
) AS defaults(preference_key, default_value)
ON CONFLICT (user_id, preference_key) DO NOTHING;

-- Remove the placeholder entries (they were just for schema documentation)
DELETE FROM public.user_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

COMMIT;
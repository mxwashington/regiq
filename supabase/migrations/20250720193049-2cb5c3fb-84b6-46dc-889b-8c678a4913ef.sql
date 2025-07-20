-- Reset the last run timestamps to force fresh data fetch
-- First, create a function to handle the reset safely
CREATE OR REPLACE FUNCTION public.reset_data_pipeline_timestamps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Delete all last_run settings to force immediate pipeline execution
  DELETE FROM public.system_settings WHERE setting_key LIKE 'last_run_%';
  
  -- Log the reset
  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES (
    'pipeline_reset_timestamp',
    json_build_object('timestamp', extract(epoch from now()) * 1000),
    'Last time the data pipeline was manually reset'
  ) ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
END;
$$;

-- Execute the reset function
SELECT public.reset_data_pipeline_timestamps();
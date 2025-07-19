-- Add IP tracking to profiles table for session management
ALTER TABLE public.profiles 
ADD COLUMN last_ip_address inet,
ADD COLUMN last_seen_at timestamp with time zone DEFAULT now(),
ADD COLUMN trusted_ips inet[] DEFAULT '{}',
ADD COLUMN session_extended_until timestamp with time zone;

-- Create function to update user activity and IP tracking
CREATE OR REPLACE FUNCTION public.update_user_activity(
  user_id_param uuid,
  ip_address_param inet DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    last_seen_at = now(),
    last_ip_address = COALESCE(ip_address_param, last_ip_address),
    -- Extend session if from trusted IP
    session_extended_until = CASE 
      WHEN ip_address_param = ANY(trusted_ips) 
      THEN now() + INTERVAL '30 days'
      ELSE session_extended_until
    END
  WHERE profiles.user_id = user_id_param;
  
  -- Add IP to trusted IPs if user has been active from this IP
  IF ip_address_param IS NOT NULL THEN
    UPDATE public.profiles
    SET trusted_ips = array_append(
      COALESCE(trusted_ips, '{}'),
      ip_address_param
    )
    WHERE profiles.user_id = user_id_param
    AND NOT (ip_address_param = ANY(COALESCE(trusted_ips, '{}')))
    AND last_seen_at > now() - INTERVAL '1 hour'; -- Only trust IPs used recently
  END IF;
END;
$$;

-- Create function to check if session should be extended
CREATE OR REPLACE FUNCTION public.should_extend_session(
  user_id_param uuid,
  current_ip inet DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT 
        (session_extended_until > now()) OR 
        (current_ip = ANY(COALESCE(trusted_ips, '{}')))
      FROM public.profiles 
      WHERE profiles.user_id = user_id_param
    ),
    false
  );
$$;
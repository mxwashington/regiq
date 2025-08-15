-- Add function to securely grant admin permissions
CREATE OR REPLACE FUNCTION public.grant_admin_permission(
  target_user_id UUID,
  permission_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only super admins can grant permissions
  IF NOT (is_admin(auth.uid()) AND 
          EXISTS (SELECT 1 FROM profiles 
                  WHERE user_id = auth.uid() 
                  AND 'super_admin' = ANY(admin_permissions))) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can grant permissions';
  END IF;
  
  -- Add permission to target user
  UPDATE public.profiles 
  SET admin_permissions = array_append(
    COALESCE(admin_permissions, '{}'),
    permission_name
  )
  WHERE user_id = target_user_id
  AND NOT (permission_name = ANY(COALESCE(admin_permissions, '{}')));
  
  -- Log the permission grant
  INSERT INTO public.security_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    auth.uid(),
    'admin_permission_granted',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'permission', permission_name,
      'granted_by', auth.uid()
    )
  );
END;
$$;

-- Add function to revoke admin permissions
CREATE OR REPLACE FUNCTION public.revoke_admin_permission(
  target_user_id UUID,
  permission_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only super admins can revoke permissions
  IF NOT (is_admin(auth.uid()) AND 
          EXISTS (SELECT 1 FROM profiles 
                  WHERE user_id = auth.uid() 
                  AND 'super_admin' = ANY(admin_permissions))) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can revoke permissions';
  END IF;
  
  -- Remove permission from target user
  UPDATE public.profiles 
  SET admin_permissions = array_remove(
    COALESCE(admin_permissions, '{}'),
    permission_name
  )
  WHERE user_id = target_user_id;
  
  -- Log the permission revocation
  INSERT INTO public.security_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    auth.uid(),
    'admin_permission_revoked',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'permission', permission_name,
      'revoked_by', auth.uid()
    )
  );
END;
$$;
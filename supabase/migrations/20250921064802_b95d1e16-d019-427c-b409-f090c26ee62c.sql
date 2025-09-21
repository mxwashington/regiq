-- Fix infinite RLS recursion in facility_users and team_memberships tables
-- Create security definer functions to avoid circular dependencies

-- Function to check if user is facility admin
CREATE OR REPLACE FUNCTION public.is_facility_admin(facility_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.facility_users 
    WHERE facility_id = facility_id_param 
    AND user_id = user_id_param 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Function to check if user is team admin/manager
CREATE OR REPLACE FUNCTION public.is_team_admin_or_manager(team_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_memberships 
    WHERE team_id = team_id_param 
    AND user_id = user_id_param 
    AND role IN ('admin', 'manager')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Function to get user's active team memberships
CREATE OR REPLACE FUNCTION public.get_user_active_teams(user_id_param uuid)
RETURNS TABLE(team_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id
  FROM public.team_memberships tm
  WHERE tm.user_id = user_id_param 
  AND tm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Facility admins can manage users" ON public.facility_users;
DROP POLICY IF EXISTS "Team admins can manage team memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Team members can manage assignments" ON public.team_alert_assignments;

-- Create new non-recursive policies for facility_users
CREATE POLICY "facility_users_admin_management" ON public.facility_users
FOR ALL USING (
  -- Users can see their own memberships
  user_id = auth.uid() OR 
  -- Or if they're an admin of the facility (using security definer function)
  public.is_facility_admin(facility_id, auth.uid())
)
WITH CHECK (
  -- Users can only be added by facility admins
  public.is_facility_admin(facility_id, auth.uid())
);

-- Create new non-recursive policies for team_memberships  
CREATE POLICY "team_memberships_admin_management" ON public.team_memberships
FOR ALL USING (
  -- Users can see memberships for teams they belong to
  team_id IN (SELECT get_user_active_teams(auth.uid()))
)
WITH CHECK (
  -- Only team admins/managers can modify memberships
  public.is_team_admin_or_manager(team_id, auth.uid())
);

-- Fix team_alert_assignments policy
CREATE POLICY "team_alert_assignments_member_access" ON public.team_alert_assignments
FOR ALL USING (
  team_id IN (SELECT get_user_active_teams(auth.uid()))
)
WITH CHECK (
  public.is_team_admin_or_manager(team_id, auth.uid())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_facility_users_lookup ON public.facility_users(facility_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_team_memberships_lookup ON public.team_memberships(team_id, user_id, role, status);
CREATE INDEX IF NOT EXISTS idx_team_alert_assignments_team ON public.team_alert_assignments(team_id);
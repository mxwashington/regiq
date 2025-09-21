-- Enhanced Multi-Facility Support System
-- Create comprehensive facility management tables

-- Update facilities table with enhanced fields
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS facility_type text DEFAULT 'manufacturing';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS regulatory_zones text[] DEFAULT '{}';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS compliance_requirements jsonb DEFAULT '{}';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS contact_info jsonb DEFAULT '{}';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- Create facility_users table for multi-user facility access
CREATE TABLE IF NOT EXISTS public.facility_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer', -- admin, manager, viewer
  permissions jsonb DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(facility_id, user_id)
);

-- Create facility_alerts table for facility-specific alert settings
CREATE TABLE IF NOT EXISTS public.facility_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL,
  is_relevant BOOLEAN DEFAULT true,
  risk_level text DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  status text DEFAULT 'new', -- new, reviewing, acknowledged, resolved
  notes text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.facility_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facility_users
CREATE POLICY "Users can view their facility memberships" 
ON public.facility_users 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Facility admins can manage users" 
ON public.facility_users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.facility_users fu 
    WHERE fu.facility_id = facility_users.facility_id 
    AND fu.user_id = auth.uid() 
    AND fu.role = 'admin'
  )
);

-- RLS Policies for facility_alerts
CREATE POLICY "Users can view facility alerts for their facilities" 
ON public.facility_alerts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.facility_users fu 
    WHERE fu.facility_id = facility_alerts.facility_id 
    AND fu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage facility alerts for facilities they manage" 
ON public.facility_alerts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.facility_users fu 
    WHERE fu.facility_id = facility_alerts.facility_id 
    AND fu.user_id = auth.uid() 
    AND fu.role IN ('admin', 'manager')
  )
);

-- Functions for facility management
CREATE OR REPLACE FUNCTION public.get_user_facilities(user_uuid uuid)
RETURNS TABLE(
  facility_id uuid,
  facility_name text,
  facility_type text,
  user_role text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.facility_type,
    fu.role,
    f.status
  FROM public.facilities f
  JOIN public.facility_users fu ON f.id = fu.facility_id
  WHERE fu.user_id = user_uuid
  ORDER BY f.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_facility_with_admin(
  facility_name text,
  facility_address text,
  facility_type text DEFAULT 'manufacturing'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_facility_id uuid;
BEGIN
  -- Create the facility
  INSERT INTO public.facilities (name, address, facility_type, organization_user_id)
  VALUES (facility_name, facility_address, facility_type, auth.uid())
  RETURNING id INTO new_facility_id;
  
  -- Make creator an admin
  INSERT INTO public.facility_users (facility_id, user_id, role)
  VALUES (new_facility_id, auth.uid(), 'admin');
  
  RETURN new_facility_id;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_facility_users_updated_at
  BEFORE UPDATE ON public.facility_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_facility_alerts_updated_at
  BEFORE UPDATE ON public.facility_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
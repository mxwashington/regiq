-- Add role field to profiles table
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';

-- Create user analytics tracking table
CREATE TABLE public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- 'login', 'alert_view', 'email_open', 'search', 'dashboard_visit'
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app settings table
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin activities log table
CREATE TABLE public.admin_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'user_role_change', 'user_deactivate', 'settings_update', etc.
  target_type TEXT, -- 'user', 'settings', 'system'
  target_id TEXT, -- user_id, setting_key, etc.
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE profiles.user_id = $1),
    false
  );
$$;

-- RLS Policies for user_analytics
CREATE POLICY "Admins can manage user analytics" ON public.user_analytics
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for app_settings  
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for admin_activities
CREATE POLICY "Admins can view all activities" ON public.admin_activities
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activities" ON public.admin_activities
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for system_settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- Set marcus@fsqahelp.org as admin user
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'marcus@fsqahelp.org';

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('alert_sources_enabled', '["FDA", "USDA", "EPA", "EMA", "FSIS", "EFSA"]', 'List of enabled alert sources'),
('default_urgency_threshold', '"Medium"', 'Default urgency threshold for new users'),
('email_notifications_enabled', 'true', 'Global toggle for email notifications'),
('user_registration_open', 'true', 'Whether new user registration is allowed'),
('maintenance_mode', 'false', 'Whether the app is in maintenance mode'),
('max_alerts_per_user', '1000', 'Maximum alerts per user per month');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
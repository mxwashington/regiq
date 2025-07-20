-- Check if role column exists and add only if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- Create user analytics tracking table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- 'login', 'alert_view', 'email_open', 'search', 'dashboard_visit'
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin activities log table (if not exists)
CREATE TABLE IF NOT EXISTS public.admin_activities (
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

-- Enable RLS on new tables
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_analytics
DROP POLICY IF EXISTS "Admins can manage user analytics" ON public.user_analytics;
CREATE POLICY "Admins can manage user analytics" ON public.user_analytics
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for admin_activities
DROP POLICY IF EXISTS "Admins can view all activities" ON public.admin_activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.admin_activities;

CREATE POLICY "Admins can view all activities" ON public.admin_activities
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activities" ON public.admin_activities
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Update RLS policies for profiles to allow admins to view all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING ((auth.uid() = user_id) OR public.is_admin(auth.uid()));

-- Set marcus@fsqahelp.org as admin user
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'marcus@fsqahelp.org';

-- Insert sample analytics data for testing
INSERT INTO public.user_analytics (user_id, event_type, event_data) 
SELECT 
    p.user_id,
    CASE 
        WHEN random() < 0.3 THEN 'login'
        WHEN random() < 0.5 THEN 'alert_view'
        WHEN random() < 0.7 THEN 'search'
        ELSE 'dashboard_visit'
    END,
    jsonb_build_object(
        'source', CASE WHEN random() < 0.5 THEN 'web' ELSE 'mobile' END,
        'duration', floor(random() * 300 + 10)
    )
FROM public.profiles p
CROSS JOIN generate_series(1, 5); -- 5 events per user
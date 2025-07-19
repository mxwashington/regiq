-- Extend existing profiles table with admin functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('user', 'admin', 'super_admin')) DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_permissions TEXT[] DEFAULT '{}';

-- Create admin activity logging table
CREATE TABLE public.admin_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT, -- 'user', 'feed', 'system'
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for admin activities
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for admin activities
CREATE POLICY "Admins can view all activities" ON public.admin_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can insert activities" ON public.admin_activities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
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

-- Enable RLS for system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create RSS feed logs table
CREATE TABLE public.rss_feed_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id TEXT NOT NULL, -- Using TEXT since we don't have an actual RSS feeds table yet
  fetch_status TEXT CHECK (fetch_status IN ('success', 'error', 'timeout')),
  items_fetched INTEGER DEFAULT 0,
  error_message TEXT,
  fetch_duration INTEGER, -- milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for RSS feed logs
ALTER TABLE public.rss_feed_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for RSS feed logs
CREATE POLICY "Admins can view feed logs" ON public.rss_feed_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "System can insert feed logs" ON public.rss_feed_logs
FOR INSERT
WITH CHECK (true);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE profiles.user_id = $1),
    false
  );
$$;

-- Seed admin user for marcus@fsqahelp.org (will be created after first sign-in)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('admin_emails', '["marcus@fsqahelp.org"]', 'List of emails that should be granted admin access'),
  ('rss_refresh_interval', '300', 'RSS feed refresh interval in seconds'),
  ('max_feed_items_per_source', '50', 'Maximum number of items to fetch per RSS source')
ON CONFLICT (setting_key) DO NOTHING;
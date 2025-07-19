-- Drop the existing role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Create new role check constraint that includes enterprise_admin
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'super_admin'::text, 'enterprise_admin'::text]));

-- Now upgrade marcus@fsqahelp.org to enterprise admin with unlimited access
UPDATE public.profiles 
SET 
  role = 'enterprise_admin',
  is_admin = true,
  admin_permissions = ARRAY[
    'user_management', 
    'feed_management', 
    'system_settings', 
    'analytics', 
    'billing',
    'demo_mode',
    'enterprise_features',
    'api_management',
    'white_label_controls'
  ]
WHERE email = 'marcus@fsqahelp.org';

-- Create demo content table for sales presentations
CREATE TABLE public.demo_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT CHECK (content_type IN ('recall', 'alert', 'search_result', 'analytics', 'user_activity')),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  industry_focus TEXT CHECK (industry_focus IN ('food_safety', 'pharmaceutical', 'agriculture', 'general')),
  demo_scenario TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create demo sessions for tracking demo usage
CREATE TABLE public.demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT UNIQUE NOT NULL,
  demo_scenario TEXT,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  session_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enterprise features tracking
CREATE TABLE public.enterprise_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  usage_limit INTEGER DEFAULT NULL, -- NULL means unlimited
  current_usage INTEGER DEFAULT 0,
  reset_period TEXT DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

-- Enable RLS on new tables
ALTER TABLE public.demo_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_features ENABLE ROW LEVEL SECURITY;

-- Create policies for demo content (admins can manage, others can read in demo mode)
CREATE POLICY "Admins can manage demo content" 
ON public.demo_content 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view active demo content" 
ON public.demo_content 
FOR SELECT 
USING (is_active = true);

-- Create policies for demo sessions (admins can manage, users can manage their own)
CREATE POLICY "Admins can manage all demo sessions" 
ON public.demo_sessions 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage their own demo sessions" 
ON public.demo_sessions 
FOR ALL 
USING (auth.uid() = created_by);

-- Create policies for enterprise features (admins can manage, users can view their own)
CREATE POLICY "Admins can manage enterprise features" 
ON public.enterprise_features 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own enterprise features" 
ON public.enterprise_features 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_demo_content_updated_at
  BEFORE UPDATE ON public.demo_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demo_sessions_updated_at
  BEFORE UPDATE ON public.demo_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enterprise_features_updated_at
  BEFORE UPDATE ON public.enterprise_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert enterprise features for marcus@fsqahelp.org
INSERT INTO public.enterprise_features (user_id, feature_name, is_enabled, usage_limit)
SELECT 
  p.user_id,
  feature_name,
  true,
  NULL -- unlimited
FROM public.profiles p,
UNNEST(ARRAY[
  'unlimited_searches',
  'unlimited_alerts', 
  'api_access',
  'white_label',
  'custom_integrations',
  'priority_support',
  'demo_mode',
  'advanced_analytics',
  'user_management',
  'content_management'
]) AS feature_name
WHERE p.email = 'marcus@fsqahelp.org';

-- Insert sample demo content for different scenarios
INSERT INTO public.demo_content (content_type, title, content, industry_focus, demo_scenario, display_order) VALUES
('recall', 'Multi-State Listeria Outbreak - Deli Meats', '{
  "recall_number": "F-0123-2024",
  "product": "Ready-to-eat deli turkey and ham",
  "company": "Demo Deli Corp",
  "reason": "Potential Listeria monocytogenes contamination",
  "classification": "Class I",
  "states_affected": ["CA", "TX", "NY", "FL", "IL"],
  "units_recalled": "245,000 pounds",
  "date_initiated": "2024-01-15",
  "fda_link": "https://example.com/demo-recall",
  "severity_score": 9.2
}', 'food_safety', 'crisis_management', 1),

('alert', 'FDA Warning Letter - GMP Violations', '{
  "alert_id": "WL-2024-001",
  "company": "Demo Pharma Manufacturing",
  "violation_type": "Current Good Manufacturing Practice",
  "severity": "High",
  "date_issued": "2024-01-20",
  "key_findings": ["Inadequate cleaning validation", "Lack of environmental monitoring", "Insufficient personnel training"],
  "response_deadline": "2024-02-19",
  "facility_location": "New Jersey, USA"
}', 'pharmaceutical', 'compliance_monitoring', 2),

('search_result', 'CFR Title 21 Food Additive Regulations', '{
  "query": "food additive safety requirements",
  "results": [
    {
      "title": "21 CFR 170.3 - Definitions",
      "section": "170.3",
      "content": "Food additive means any substance the intended use of which results or may reasonably be expected to result...",
      "relevance_score": 0.95
    },
    {
      "title": "21 CFR 171.1 - Petitions",
      "section": "171.1", 
      "content": "Any person may file with the Food and Drug Administration a petition proposing the issuance...",
      "relevance_score": 0.87
    }
  ],
  "total_results": 847,
  "search_time": "0.23s"
}', 'food_safety', 'regulatory_research', 3),

('analytics', 'Platform Usage Dashboard', '{
  "total_users": 1247,
  "active_searches_today": 89,
  "alerts_sent_24h": 156,
  "top_search_terms": ["Listeria", "GMP violations", "food additive", "recall notice", "warning letter"],
  "subscription_breakdown": {
    "free": 620,
    "professional": 480,
    "enterprise": 147
  },
  "api_calls_today": 3420,
  "system_uptime": "99.97%"
}', 'general', 'admin_overview', 4),

('user_activity', 'Demo User Engagement Metrics', '{
  "demo_sessions_today": 12,
  "average_session_duration": "24.5 minutes",
  "features_demonstrated": ["search", "alerts", "analytics", "reporting"],
  "conversion_rate": "23.5%",
  "top_demo_scenarios": ["food_safety", "pharmaceutical", "agriculture"],
  "user_feedback_score": 4.7
}', 'general', 'sales_metrics', 5);

-- Create function to check if user has enterprise features
CREATE OR REPLACE FUNCTION public.has_enterprise_feature(user_id_param UUID, feature_name_param TEXT)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.enterprise_features 
     WHERE user_id = user_id_param AND feature_name = feature_name_param),
    false
  );
$$;

-- Create function to get user's enterprise feature limits
CREATE OR REPLACE FUNCTION public.get_feature_usage(user_id_param UUID, feature_name_param TEXT)
RETURNS TABLE(current_usage INTEGER, usage_limit INTEGER, is_unlimited BOOLEAN)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    COALESCE(ef.current_usage, 0) as current_usage,
    ef.usage_limit,
    (ef.usage_limit IS NULL) as is_unlimited
  FROM public.enterprise_features ef
  WHERE ef.user_id = user_id_param AND ef.feature_name = feature_name_param;
$$;
-- Enhanced analytics tables for comprehensive tracking
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  load_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL UNIQUE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  pages_visited INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  operating_system TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  interaction_type TEXT NOT NULL, -- click, search, filter, save, dismiss
  element_id TEXT,
  element_type TEXT, -- button, link, input, card
  page_path TEXT,
  interaction_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alert_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  alert_id UUID REFERENCES public.alerts(id),
  interaction_type TEXT NOT NULL, -- view, save, dismiss, click, share
  interaction_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  search_query TEXT NOT NULL,
  search_type TEXT, -- general, alerts, regulatory
  results_count INTEGER,
  clicked_result_position INTEGER,
  search_duration_ms INTEGER,
  filters_applied JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all analytics tables
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics tables
CREATE POLICY "Admins can view all page views" ON public.page_views FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert their own page views" ON public.page_views FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all sessions" ON public.user_sessions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all interactions" ON public.user_interactions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert their own interactions" ON public.user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all alert interactions" ON public.alert_interactions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert their own alert interactions" ON public.alert_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all search analytics" ON public.search_analytics FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users can insert their own search analytics" ON public.search_analytics FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON public.page_views(page_path);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON public.user_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON public.user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON public.user_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_alert_interactions_user_id ON public.alert_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_interactions_alert_id ON public.alert_interactions(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_interactions_type ON public.alert_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON public.search_analytics(created_at);

-- Functions for analytics aggregation
CREATE OR REPLACE FUNCTION public.get_analytics_overview(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_page_views BIGINT,
  unique_visitors BIGINT,
  avg_session_duration NUMERIC,
  bounce_rate NUMERIC,
  top_pages JSONB,
  user_growth JSONB,
  device_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.page_views WHERE created_at >= NOW() - INTERVAL '1 day' * days_back) as total_page_views,
    (SELECT COUNT(DISTINCT user_id) FROM public.page_views WHERE created_at >= NOW() - INTERVAL '1 day' * days_back) as unique_visitors,
    (SELECT AVG(duration_seconds) FROM public.user_sessions WHERE start_time >= NOW() - INTERVAL '1 day' * days_back AND duration_seconds IS NOT NULL) as avg_session_duration,
    (SELECT 
      ROUND(
        (COUNT(*) FILTER (WHERE pages_visited = 1)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
      )
      FROM public.user_sessions 
      WHERE start_time >= NOW() - INTERVAL '1 day' * days_back
    ) as bounce_rate,
    (SELECT jsonb_agg(jsonb_build_object('page', page_path, 'views', view_count))
     FROM (
       SELECT page_path, COUNT(*) as view_count
       FROM public.page_views 
       WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
       GROUP BY page_path
       ORDER BY view_count DESC
       LIMIT 10
     ) top_pages_data
    ) as top_pages,
    (SELECT jsonb_agg(jsonb_build_object('date', date_str, 'new_users', new_users))
     FROM (
       SELECT DATE(created_at)::TEXT as date_str, COUNT(*) as new_users
       FROM public.profiles
       WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)
     ) growth_data
    ) as user_growth,
    (SELECT jsonb_agg(jsonb_build_object('device', device_type, 'count', device_count))
     FROM (
       SELECT COALESCE(device_type, 'Unknown') as device_type, COUNT(*) as device_count
       FROM public.user_sessions
       WHERE start_time >= NOW() - INTERVAL '1 day' * days_back
       GROUP BY device_type
     ) device_data
    ) as device_breakdown;
END;
$function$;
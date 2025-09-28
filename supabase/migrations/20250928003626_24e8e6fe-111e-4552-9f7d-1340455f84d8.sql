-- Create alert_sync_logs table for detailed sync tracking
CREATE TABLE IF NOT EXISTS public.alert_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  run_started TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  run_finished TIMESTAMP WITH TIME ZONE,
  alerts_fetched INTEGER DEFAULT 0,
  alerts_inserted INTEGER DEFAULT 0,
  alerts_updated INTEGER DEFAULT 0,
  alerts_skipped INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts_summary table for source statistics
CREATE TABLE IF NOT EXISTS public.alerts_summary (
  source TEXT PRIMARY KEY,
  total_alerts INTEGER NOT NULL DEFAULT 0,
  recent_alerts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.alert_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for alert_sync_logs
CREATE POLICY "Admins can view all sync logs" ON public.alert_sync_logs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can manage sync logs" ON public.alert_sync_logs
  FOR ALL USING (true);

-- RLS policies for alerts_summary
CREATE POLICY "Authenticated users can view alerts summary" ON public.alerts_summary
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage alerts summary" ON public.alerts_summary
  FOR ALL USING (true);

-- Function to start sync logging with metadata
CREATE OR REPLACE FUNCTION public.start_sync_log(
  p_source TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.alert_sync_logs (source, metadata)
  VALUES (p_source, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id::TEXT;
END;
$$;

-- Function to finish sync logging with detailed metrics
CREATE OR REPLACE FUNCTION public.finish_sync_log(
  p_log_id TEXT,
  p_status TEXT,
  p_alerts_fetched INTEGER DEFAULT NULL,
  p_alerts_inserted INTEGER DEFAULT NULL,
  p_alerts_updated INTEGER DEFAULT NULL,
  p_alerts_skipped INTEGER DEFAULT NULL,
  p_errors TEXT[] DEFAULT NULL,
  p_results JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.alert_sync_logs
  SET 
    status = p_status,
    run_finished = now(),
    alerts_fetched = COALESCE(p_alerts_fetched, alerts_fetched),
    alerts_inserted = COALESCE(p_alerts_inserted, alerts_inserted),
    alerts_updated = COALESCE(p_alerts_updated, alerts_updated),
    alerts_skipped = COALESCE(p_alerts_skipped, alerts_skipped),
    errors = COALESCE(p_errors, errors),
    metadata = metadata || p_results
  WHERE id = p_log_id::UUID;
  
  -- Update alerts summary
  INSERT INTO public.alerts_summary (source, total_alerts, recent_alerts)
  SELECT 
    source,
    COALESCE(p_alerts_inserted, 0) + COALESCE(p_alerts_updated, 0),
    COALESCE(p_alerts_inserted, 0) + COALESCE(p_alerts_updated, 0)
  FROM public.alert_sync_logs
  WHERE id = p_log_id::UUID
  ON CONFLICT (source) DO UPDATE SET
    total_alerts = alerts_summary.total_alerts + COALESCE(p_alerts_inserted, 0) + COALESCE(p_alerts_updated, 0),
    recent_alerts = COALESCE(p_alerts_inserted, 0) + COALESCE(p_alerts_updated, 0),
    updated_at = now();
END;
$$;

-- Function to upsert alerts with proper conflict handling
CREATE OR REPLACE FUNCTION public.upsert_alert(
  p_external_id TEXT,
  p_source TEXT,
  p_title TEXT,
  p_summary TEXT,
  p_link_url TEXT DEFAULT NULL,
  p_date_published TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_updated TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_jurisdiction TEXT DEFAULT NULL,
  p_locations TEXT[] DEFAULT NULL,
  p_product_types TEXT[] DEFAULT NULL,
  p_category TEXT DEFAULT 'General',
  p_severity TEXT DEFAULT 'Medium',
  p_raw JSONB DEFAULT '{}',
  p_hash TEXT DEFAULT NULL
)
RETURNS TABLE(action TEXT, id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_id UUID;
  action_taken TEXT;
  existing_alert RECORD;
BEGIN
  -- Check if alert already exists
  SELECT * INTO existing_alert
  FROM public.alerts
  WHERE (external_id = p_external_id AND source = p_source)
     OR (p_hash IS NOT NULL AND p_hash != '' AND p_hash = ANY(string_to_array(full_content, ' ')));
  
  IF existing_alert.id IS NOT NULL THEN
    -- Update existing alert
    UPDATE public.alerts SET
      title = p_title,
      summary = p_summary,
      external_url = p_link_url,
      published_date = COALESCE(p_date_published, published_date),
      updated_at = now(),
      full_content = p_raw::TEXT
    WHERE id = existing_alert.id;
    
    action_taken := 'updated';
    alert_id := existing_alert.id;
  ELSE
    -- Insert new alert
    INSERT INTO public.alerts (
      external_id,
      source,
      title,
      summary,
      external_url,
      published_date,
      urgency,
      full_content,
      created_at,
      updated_at
    ) VALUES (
      p_external_id,
      p_source,
      p_title,
      p_summary,
      p_link_url,
      COALESCE(p_date_published, now()),
      p_severity,
      p_raw::TEXT,
      now(),
      now()
    ) RETURNING id INTO alert_id;
    
    action_taken := 'inserted';
  END IF;
  
  RETURN QUERY SELECT action_taken, alert_id;
END;
$$;
-- Create Custom Data Sources tables
CREATE TABLE public.custom_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'email', 'webhook', 'scraper')),
  configuration JSONB NOT NULL DEFAULT '{}',
  auth_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_frequency INTEGER DEFAULT 3600, -- seconds
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'disabled')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_data_sources ENABLE ROW LEVEL SECURITY;

-- Custom data sources policies
CREATE POLICY "Users can manage their own custom data sources"
ON public.custom_data_sources
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can access custom data sources for processing"
ON public.custom_data_sources
FOR SELECT
USING (true);

-- Create Webhooks tables
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  endpoint_url TEXT NOT NULL,
  secret_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  events JSONB NOT NULL DEFAULT '[]', -- array of event types to listen for
  headers JSONB DEFAULT '{}',
  retry_config JSONB DEFAULT '{"max_retries": 3, "retry_delay": 300}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Webhook endpoints policies
CREATE POLICY "Users can manage their own webhook endpoints"
ON public.webhook_endpoints
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create webhook delivery logs
CREATE TABLE public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivery_attempts INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying'))
);

-- Enable RLS
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Webhook deliveries policies
CREATE POLICY "Users can view their own webhook deliveries"
ON public.webhook_deliveries
FOR SELECT
USING (webhook_endpoint_id IN (
  SELECT id FROM public.webhook_endpoints WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage webhook deliveries"
ON public.webhook_deliveries
FOR ALL
USING (true);

-- Create custom data ingestion logs
CREATE TABLE public.custom_data_ingestion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id UUID NOT NULL REFERENCES public.custom_data_sources(id) ON DELETE CASCADE,
  records_processed INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  error_details JSONB DEFAULT '{}',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.custom_data_ingestion_logs ENABLE ROW LEVEL SECURITY;

-- Custom data ingestion logs policies
CREATE POLICY "Users can view their own ingestion logs"
ON public.custom_data_ingestion_logs
FOR SELECT
USING (data_source_id IN (
  SELECT id FROM public.custom_data_sources WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage ingestion logs"
ON public.custom_data_ingestion_logs
FOR ALL
USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_custom_data_sources_updated_at
BEFORE UPDATE ON public.custom_data_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_endpoints_updated_at
BEFORE UPDATE ON public.webhook_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_custom_data_sources_user_id ON public.custom_data_sources(user_id);
CREATE INDEX idx_custom_data_sources_active ON public.custom_data_sources(is_active) WHERE is_active = true;
CREATE INDEX idx_webhook_endpoints_user_id ON public.webhook_endpoints(user_id);
CREATE INDEX idx_webhook_deliveries_endpoint_id ON public.webhook_deliveries(webhook_endpoint_id);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status);
CREATE INDEX idx_custom_data_ingestion_logs_source_id ON public.custom_data_ingestion_logs(data_source_id);
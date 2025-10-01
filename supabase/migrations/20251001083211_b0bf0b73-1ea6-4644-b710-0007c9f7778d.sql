-- Create error logging table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for querying recent errors
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_function ON public.error_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON public.error_logs(resolved) WHERE resolved = false;

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all error logs
CREATE POLICY "Admins can view error logs"
  ON public.error_logs FOR SELECT
  USING (is_admin(auth.uid()));

-- System can insert error logs
CREATE POLICY "System can insert error logs"
  ON public.error_logs FOR INSERT
  WITH CHECK (true);

-- Create API health check table
CREATE TABLE IF NOT EXISTS public.api_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'error')),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for querying latest health checks
CREATE INDEX IF NOT EXISTS idx_api_health_checks_api_name ON public.api_health_checks(api_name, checked_at DESC);

-- Enable RLS
ALTER TABLE public.api_health_checks ENABLE ROW LEVEL SECURITY;

-- Admins can view health checks
CREATE POLICY "Admins can view health checks"
  ON public.api_health_checks FOR SELECT
  USING (is_admin(auth.uid()));

-- System can insert health checks
CREATE POLICY "System can insert health checks"
  ON public.api_health_checks FOR INSERT
  WITH CHECK (true);
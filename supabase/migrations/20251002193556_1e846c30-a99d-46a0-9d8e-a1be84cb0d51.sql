-- Create CDC test table for inline testing
CREATE TABLE IF NOT EXISTS public.cdc_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  urgency TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL,
  external_url TEXT,
  full_content TEXT,
  agency TEXT NOT NULL,
  region TEXT,
  relevance_score INTEGER,
  test_run_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cdc_test ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage test data
CREATE POLICY "Admins can manage CDC test data"
ON public.cdc_test
FOR ALL
USING (is_admin(auth.uid()));

-- Allow system to insert test data
CREATE POLICY "System can insert CDC test data"
ON public.cdc_test
FOR INSERT
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cdc_test_run_id ON public.cdc_test(test_run_id);
CREATE INDEX IF NOT EXISTS idx_cdc_test_external_id ON public.cdc_test(external_id);
CREATE INDEX IF NOT EXISTS idx_cdc_test_published_date ON public.cdc_test(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_cdc_test_relevance_score ON public.cdc_test(relevance_score DESC);

COMMENT ON TABLE public.cdc_test IS 'Temporary table for CDC inline testing - stores sample data from EID and MMWR feeds before production insertion';
COMMENT ON COLUMN public.cdc_test.relevance_score IS 'Food relevance score (0-100): HIGH ≥60, MEDIUM 30-59, LOW <30';
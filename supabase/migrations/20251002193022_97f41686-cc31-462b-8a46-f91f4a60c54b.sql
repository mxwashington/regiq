-- Create EPA test table for inline testing
CREATE TABLE IF NOT EXISTS public.epa_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  urgency TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL,
  external_url TEXT,
  full_content TEXT,
  agency TEXT NOT NULL,
  region TEXT,
  external_id TEXT NOT NULL,
  relevance_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  test_run_id UUID DEFAULT gen_random_uuid()
);

-- Enable RLS
ALTER TABLE public.epa_test ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage test data
CREATE POLICY "Admins can manage EPA test data"
ON public.epa_test
FOR ALL
USING (is_admin(auth.uid()));

-- Allow system to insert test data
CREATE POLICY "System can insert EPA test data"
ON public.epa_test
FOR INSERT
WITH CHECK (true);

-- Add index for test runs
CREATE INDEX IF NOT EXISTS idx_epa_test_run_id ON public.epa_test(test_run_id);
CREATE INDEX IF NOT EXISTS idx_epa_test_external_id ON public.epa_test(external_id);
CREATE INDEX IF NOT EXISTS idx_epa_test_published_date ON public.epa_test(published_date DESC);

COMMENT ON TABLE public.epa_test IS 'Temporary table for EPA inline testing - stores sample data before production insertion';

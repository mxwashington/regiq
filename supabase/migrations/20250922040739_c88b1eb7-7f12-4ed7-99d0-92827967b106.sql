-- Add Regulations.gov API to regulatory_data_sources
INSERT INTO public.regulatory_data_sources (
  name, 
  agency, 
  region, 
  source_type, 
  base_url,
  data_gov_org,
  polling_interval_minutes,
  priority,
  keywords,
  is_active
) VALUES (
  'Regulations.gov API',
  'GSA',
  'US',
  'api',
  'https://api.regulations.gov/v4',
  'regulations-gov',
  60,
  1,
  '["regulations", "federal register", "public comments", "rulemaking"]'::jsonb,
  true
) ON CONFLICT (name, agency) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  updated_at = now();
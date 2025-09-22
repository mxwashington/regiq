-- Add FDA Warning Letters and Compliance Actions data sources
INSERT INTO public.data_sources (name, agency, region, source_type, url, is_active, keywords, priority, polling_interval_minutes, metadata) VALUES 
(
  'FDA Warning Letters Feed',
  'FDA',
  'US',
  'api',
  'https://datadashboard.fda.gov/ora/api/complianceactions.json',
  true,
  '["warning letter", "483", "consent decree", "enforcement action", "compliance", "violation", "inspection"]',
  8,
  240,
  '{"description": "FDA compliance actions including warning letters, 483s, and consent decrees", "requires_auth": true, "api_type": "fda_dashboard"}'
),
(
  'FDA Inspection Observations (483s)',
  'FDA',
  'US', 
  'api',
  'https://datadashboard.fda.gov/ora/api/inspectionscitations.json',
  true,
  '["483", "form 483", "inspection observation", "violation", "facility inspection", "compliance"]',
  8,
  240,
  '{"description": "FDA Form 483 inspection observations and citations", "requires_auth": true, "api_type": "fda_dashboard"}'
);
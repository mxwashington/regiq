-- Remove all alerts that appear to be sample/demo data based on patterns
DELETE FROM public.alerts 
WHERE 
  -- Remove all alerts with sample/demo-style external URLs
  external_url LIKE '%fda.gov/%' 
  OR external_url LIKE '%epa.gov/%'
  OR external_url LIKE '%usda.gov/%'
  OR external_url LIKE '%fsis.usda.gov/%'
  OR external_url LIKE '%fns.usda.gov/%'
  OR external_url LIKE '%ams.usda.gov/%'
  OR external_url LIKE '%fsa.usda.gov/%'
  -- Remove by generic/sample-sounding titles
  OR title LIKE '%Inspection Violations'
  OR title LIKE '%Contamination Alert'
  OR title LIKE '%Registration Approval%'
  OR title LIKE '%Compliance Review'
  OR title LIKE '%Certification Violation%'
  OR title LIKE '%Product Adulteration'
  OR title LIKE '%Software Error'
  OR title LIKE '%Inspection Results%'
  OR title LIKE '%Equipment Recall'
  OR title LIKE '%Progress Report'
  OR title LIKE '%Program Updates'
  OR title LIKE '%Standards Update%'
  -- Remove alerts that were bulk inserted (same created_at time)
  OR created_at = '2025-07-20 06:11:18.804757+00';
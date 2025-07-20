-- Clear existing alerts with incorrect dates (future dates that shouldn't exist)
DELETE FROM alerts WHERE published_date > NOW();

-- Clear old research dataset entries that aren't actual regulatory announcements
DELETE FROM alerts WHERE title LIKE '%Data from:%';
DELETE FROM alerts WHERE title LIKE '%Dataset%' AND title NOT LIKE '%recall%' AND title NOT LIKE '%warning%' AND title NOT LIKE '%alert%';

-- Clear EPA entries that are datasets rather than enforcement actions
DELETE FROM alerts WHERE source = 'EPA' AND (
  title LIKE '%EPA Facility Registry%' OR
  title LIKE '%Chemical Data Release%' OR
  title LIKE '%Biota-Sediment%' OR
  title LIKE '%Environmental Quality Index%' OR
  title LIKE '%Critical Habitat%' OR
  title LIKE '%Endangered Species%'
);

-- Update data freshness tracking to reset fetch status
UPDATE data_freshness 
SET 
  last_successful_fetch = NOW(),
  fetch_status = 'reset_for_rss',
  error_message = 'Switched from data.gov to RSS feeds',
  updated_at = NOW()
WHERE source_name IN ('FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC');
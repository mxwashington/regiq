-- Remove the fake GSA data sources I added earlier
DELETE FROM public.data_sources 
WHERE agency = 'GSA' AND name IN (
  'GSA Schedules API',
  'GSA Contract Opportunities', 
  'GSA Federal Acquisition Service'
);

-- Add real GSA data sources with actual RSS feeds and API endpoints
INSERT INTO public.data_sources (name, agency, region, source_type, url, is_active, keywords, priority, polling_interval_minutes, metadata) VALUES 
(
  'GSA News Releases Feed',
  'GSA',
  'US',
  'rss',
  'https://www.gsa.gov/_rssfeed/newsReleases.xml',
  true,
  '["federal acquisition", "government procurement", "regulation updates", "policy changes", "contract guidance"]',
  7,
  120,
  '{"description": "Official GSA news releases covering federal acquisition policy and regulatory updates"}'
),
(
  'GSA Administrator Speeches',
  'GSA',
  'US', 
  'rss',
  'https://www.gsa.gov/_rssfeed/gsaAdminSpeech.xml',
  true,
  '["policy announcements", "administrative guidance", "federal acquisition strategy", "procurement initiatives"]',
  6,
  360,
  '{"description": "Speeches by GSA Administrator containing policy direction and strategic guidance"}'
),
(
  'SAM.gov Contract Opportunities',
  'GSA',
  'US',
  'api',
  'https://api.sam.gov/opportunities/v2/search',
  true,
  '["contract opportunities", "solicitation", "procurement", "federal contracting", "business opportunities"]',
  8,
  180,
  '{"description": "Contract opportunities from SAM.gov system", "requires_api_key": true, "api_type": "sam_gov"}'
);
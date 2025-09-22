-- Update the broken GSA news releases RSS feed URL and fix GSA sources configuration
UPDATE public.data_sources 
SET 
  rss_feeds = CASE 
    WHEN name = 'GSA Administrator Speeches' THEN '["https://www.gsa.gov/_rssfeed/gsaAdminSpeech.xml"]'
    WHEN name = 'SAM.gov Contract Opportunities' THEN '["https://api.sam.gov/opportunities/v2/search"]'
    ELSE rss_feeds
  END,
  url = NULL
WHERE agency = 'GSA';

-- Remove the broken news releases feed for now and just keep the working one
DELETE FROM public.data_sources 
WHERE name = 'GSA News Releases Feed';
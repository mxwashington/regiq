-- Update Regulations.gov API source with proper endpoints
UPDATE regulatory_data_sources 
SET rss_feeds = '["documents?filter[agencyId]=FDA,EPA,USDA&filter[postedDate][gte]=2024-01-01&sort=-postedDate"]'::jsonb,
    base_url = 'https://api.regulations.gov/v4',
    updated_at = now()
WHERE name = 'Regulations.gov API' AND agency = 'GSA';
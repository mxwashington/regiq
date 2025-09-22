-- Fix Regulations.gov API endpoint with better date filtering
UPDATE regulatory_data_sources 
SET rss_feeds = '["documents?filter[agencyId]=FDA,EPA,USDA&filter[postedDate][gte]=2025-09-01&sort=-postedDate&page[size]=50"]'::jsonb,
    updated_at = now()
WHERE name = 'Regulations.gov API' AND agency = 'GSA';
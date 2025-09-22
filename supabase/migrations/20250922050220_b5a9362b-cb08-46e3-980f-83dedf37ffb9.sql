-- Fix Regulations.gov API endpoint with correct date filter field
UPDATE regulatory_data_sources 
SET rss_feeds = '["documents?filter[agencyId]=FDA,EPA,USDA&filter[lastModifiedDate][gte]=2025-09-01&sort=-lastModifiedDate&page[size]=50"]'::jsonb,
    updated_at = now()
WHERE name = 'Regulations.gov API' AND agency = 'GSA';
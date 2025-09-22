-- Clean up old MHRA alerts that should have been removed
DELETE FROM public.alerts 
WHERE source IN ('MHRA', 'MHRA Drug Safety') 
   OR agency = 'MHRA';

-- Add GSA data sources for government contracting alerts
INSERT INTO public.data_sources (name, agency, region, source_type, url, is_active, keywords, priority, polling_interval_minutes) VALUES 
('GSA Schedules API', 'GSA', 'US', 'api', 'https://api.gsa.gov/acquisitions/fas/v1/products', true, '["government contracting", "federal acquisition", "schedules", "procurement"]', 6, 240),
('GSA Contract Opportunities', 'GSA', 'US', 'rss', 'https://www.gsa.gov/rss/contract-opportunities', true, '["contract opportunities", "solicitation", "rfp", "government contracts"]', 7, 180),
('GSA Federal Acquisition Service', 'GSA', 'US', 'api', 'https://api.gsa.gov/fas/v1/products', true, '["federal acquisition", "gsa advantage", "government purchasing"]', 6, 360);

-- Add some sample GSA alerts to demonstrate functionality
INSERT INTO public.alerts (title, source, agency, summary, urgency, published_date, external_url, region) VALUES 
('GSA Updates Federal Acquisition Regulation (FAR)', 'GSA Contract Opportunities', 'GSA', 'GSA announces updates to procurement regulations affecting federal contractors and acquisition processes.', 'Medium', NOW() - INTERVAL '2 days', 'https://www.gsa.gov/policy-regulations/regulations/federal-acquisition-regulation-far', 'US'),
('New Multiple Award Schedule (MAS) Categories Available', 'GSA Schedules API', 'GSA', 'GSA introduces new product categories under the Multiple Award Schedule program for federal procurement.', 'Medium', NOW() - INTERVAL '1 day', 'https://www.gsa.gov/buying-selling/products-services/mas-information', 'US'),
('GSA IT Schedule 70 Contract Modifications', 'GSA Federal Acquisition Service', 'GSA', 'Important modifications to IT Schedule 70 contracts affecting technology procurement by federal agencies.', 'High', NOW() - INTERVAL '3 hours', 'https://www.gsa.gov/technology/it-contract-vehicles-and-purchasing-programs/mas-information-technology', 'US'),
('Federal Strategic Sourcing Initiative Updates', 'GSA Contract Opportunities', 'GSA', 'GSA announces strategic sourcing updates for commodities and services across federal government.', 'Medium', NOW() - INTERVAL '5 days', 'https://www.gsa.gov/buying-selling/category-management/federal-strategic-sourcing-initiatives', 'US');
-- Add new API data sources for openFDA and FSIS
INSERT INTO regulatory_data_sources (name, agency, region, source_type, base_url, rss_feeds, polling_interval_minutes, priority, keywords, is_active) VALUES
-- openFDA API endpoints - HIGH PRIORITY (Enforcement/Recalls)
('FDA Drug Enforcement', 'FDA', 'US', 'api', 'https://api.fda.gov', '["drug/enforcement.json"]', 180, 9, '["drug recall", "class i", "class ii", "withdrawal", "defect"]', true),
('FDA Food Enforcement', 'FDA', 'US', 'api', 'https://api.fda.gov', '["food/enforcement.json"]', 180, 9, '["food recall", "contamination", "listeria", "salmonella", "allergen"]', true),
('FDA Device Enforcement', 'FDA', 'US', 'api', 'https://api.fda.gov', '["device/enforcement.json"]', 180, 9, '["device recall", "malfunction", "defect", "safety", "death"]', true),

-- openFDA API endpoints - MEDIUM PRIORITY (Events/Adverse Reports)
('FDA Drug Events', 'FDA', 'US', 'api', 'https://api.fda.gov', '["drug/event.json"]', 120, 8, '["adverse events", "drug reactions", "side effects", "hospitalization", "death"]', true),
('FDA Food Events', 'FDA', 'US', 'api', 'https://api.fda.gov', '["food/event.json"]', 120, 7, '["food adverse events", "foodborne illness", "contamination", "allergy"]', true),
('FDA Animal & Veterinary Events', 'FDA', 'US', 'api', 'https://api.fda.gov', '["animalandveterinary/event.json"]', 180, 6, '["veterinary", "animal", "adverse events", "pet safety"]', true),

-- openFDA API endpoints - MEDIUM PRIORITY (Drug Information)
('FDA Drugs@FDA', 'FDA', 'US', 'api', 'https://api.fda.gov', '["drug/drugsfda.json"]', 240, 6, '["drug approvals", "drug shortages", "new drugs"]', true),
('FDA Drug Labels', 'FDA', 'US', 'api', 'https://api.fda.gov', '["drug/label.json"]', 360, 5, '["drug labeling", "prescribing information", "warnings", "contraindications"]', true),

-- openFDA API endpoints - LOWER PRIORITY (Device Information)
('FDA Device PMA', 'FDA', 'US', 'api', 'https://api.fda.gov', '["device/pma.json"]', 480, 4, '["premarket approval", "medical devices", "device approvals"]', true),
('FDA Tobacco Problems', 'FDA', 'US', 'api', 'https://api.fda.gov', '["tobacco/problem.json"]', 360, 4, '["tobacco", "problem reports", "safety issues"]', true),

-- openFDA API endpoints - LOW PRIORITY (Static/Reference Data)
('FDA Drug NDC', 'FDA', 'US', 'api', 'https://api.fda.gov', '["drug/ndc.json"]', 720, 3, '["national drug code", "drug directory", "drug products"]', true),
('FDA Device Registration', 'FDA', 'US', 'api', 'https://api.fda.gov', '["device/reglist.json"]', 720, 3, '["device registration", "device listing", "medical devices"]', true),
('FDA COVID-19 Serology', 'FDA', 'US', 'api', 'https://api.fda.gov', '["device/covid19serology.json"]', 1440, 2, '["covid-19", "serology", "antibody tests", "diagnostic tests"]', true),
('FDA Device UDI', 'FDA', 'US', 'api', 'https://api.fda.gov', '["device/udi.json"]', 1440, 2, '["unique device identifier", "medical devices", "device tracking"]', true),

-- FSIS API - HIGH PRIORITY
('FSIS Meat & Poultry Recalls', 'FSIS', 'US', 'api', 'https://www.fsis.usda.gov', '["fsis/api/recall/v/1"]', 180, 9, '["meat recall", "poultry recall", "contamination", "pathogen", "e. coli", "salmonella"]', true)

ON CONFLICT (name, agency) DO UPDATE SET
 source_type = EXCLUDED.source_type,
 base_url = EXCLUDED.base_url,
 rss_feeds = EXCLUDED.rss_feeds,
 polling_interval_minutes = EXCLUDED.polling_interval_minutes,
 priority = EXCLUDED.priority,
 keywords = EXCLUDED.keywords,
 is_active = EXCLUDED.is_active,
 updated_at = now();
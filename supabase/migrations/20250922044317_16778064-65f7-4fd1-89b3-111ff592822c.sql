-- Deactivate non-US regulatory data sources, keeping only US sources + WHO & FAO
UPDATE regulatory_data_sources 
SET is_active = false
WHERE region NOT IN ('US', 'Global')
OR (region = 'Global' AND agency NOT IN ('WHO', 'FAO'));
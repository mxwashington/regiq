-- Migrate existing FDA_FOOD_SAFETY alerts to FDA
UPDATE alerts 
SET source = 'FDA', agency = 'FDA'
WHERE source = 'FDA_FOOD_SAFETY';

-- Update data_freshness table
UPDATE data_freshness 
SET source_name = 'FDA'
WHERE source_name = 'FDA_FOOD_SAFETY';

-- Update alerts_summary table if it exists
UPDATE alerts_summary 
SET source = 'FDA'
WHERE source = 'FDA_FOOD_SAFETY';
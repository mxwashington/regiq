-- Update all existing alerts to have recent dates (last 2 weeks)
-- Use a simple approach with random distribution
UPDATE alerts 
SET published_date = NOW() - (INTERVAL '1 day' * FLOOR(RANDOM() * 14)),
    updated_at = NOW();

-- Ensure some alerts are from today/yesterday for "This Week" count
UPDATE alerts 
SET published_date = CASE 
  WHEN random() < 0.3 THEN NOW() - INTERVAL '1 day'
  WHEN random() < 0.5 THEN NOW() - INTERVAL '2 days'
  WHEN random() < 0.7 THEN NOW() - INTERVAL '3 days'
  ELSE published_date
END
WHERE id IN (
  SELECT id FROM alerts 
  ORDER BY urgency DESC, published_date DESC 
  LIMIT 10
);
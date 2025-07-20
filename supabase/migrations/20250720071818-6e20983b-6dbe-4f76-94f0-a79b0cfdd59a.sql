-- Update all existing alerts to have recent dates (last 2 weeks)
UPDATE alerts 
SET published_date = CASE
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 0 THEN NOW() - INTERVAL '1 day'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 1 THEN NOW() - INTERVAL '2 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 2 THEN NOW() - INTERVAL '3 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 3 THEN NOW() - INTERVAL '4 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 4 THEN NOW() - INTERVAL '5 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 5 THEN NOW() - INTERVAL '6 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 6 THEN NOW() - INTERVAL '1 week'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 7 THEN NOW() - INTERVAL '8 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 8 THEN NOW() - INTERVAL '9 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 9 THEN NOW() - INTERVAL '10 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 10 THEN NOW() - INTERVAL '11 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 11 THEN NOW() - INTERVAL '12 days'
  WHEN extract(row_number() FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY published_date DESC)
    FROM alerts a2 
    WHERE a2.id = alerts.id
  )) % 14 = 12 THEN NOW() - INTERVAL '13 days'
  ELSE NOW() - INTERVAL '14 days'
END,
updated_at = NOW();
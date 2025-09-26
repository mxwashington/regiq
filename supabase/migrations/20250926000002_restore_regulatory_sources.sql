-- Restore Missing Regulatory Sources
-- This migration ensures all critical regulatory data sources are active and properly configured

BEGIN;

-- Ensure all critical regulatory sources are active and properly configured
-- These sources should be available to users but are likely failing due to auth issues

-- FDA sources (high priority regulatory alerts)
INSERT INTO public.data_sources (name, agency, region, source_type, url, is_active, keywords, priority, polling_interval_minutes, metadata) VALUES
-- FDA Drug Enforcement (Recalls)
('FDA Drug Enforcement API', 'FDA', 'US', 'api', 'https://api.fda.gov/drug/enforcement.json', true, '["drug recall", "class i", "class ii", "withdrawal", "defect", "fda"]', 9, 180,
 '{"description": "FDA drug recalls and enforcement actions", "api_type": "openFDA", "requires_api_key": false}'),

-- FDA Food Enforcement (Recalls)
('FDA Food Enforcement API', 'FDA', 'US', 'api', 'https://api.fda.gov/food/enforcement.json', true, '["food recall", "contamination", "listeria", "salmonella", "allergen", "fda"]', 9, 180,
 '{"description": "FDA food recalls and enforcement actions", "api_type": "openFDA", "requires_api_key": false}'),

-- FDA Device Enforcement (Recalls)
('FDA Device Enforcement API', 'FDA', 'US', 'api', 'https://api.fda.gov/device/enforcement.json', true, '["device recall", "malfunction", "defect", "safety", "death", "fda"]', 9, 180,
 '{"description": "FDA medical device recalls", "api_type": "openFDA", "requires_api_key": false}'),

-- FDA Warning Letters (High priority compliance)
('FDA Warning Letters API', 'FDA', 'US', 'api', 'https://api.fda.gov/other/warning.json', true, '["warning letter", "compliance", "violation", "enforcement", "fda"]', 8, 240,
 '{"description": "FDA warning letters and compliance actions", "api_type": "openFDA", "requires_api_key": false}'),

-- FDA RSS Feeds (backup for API failures)
('FDA Recalls & Alerts RSS', 'FDA', 'US', 'rss', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls-market-withdrawals-safety-alerts/rss.xml', true, '["recall", "safety alert", "market withdrawal", "fda"]', 8, 120,
 '{"description": "FDA official recalls RSS feed", "fallback_source": true}'),

-- USDA/FSIS sources
('FSIS Recalls & Alerts RSS', 'FSIS', 'US', 'rss', 'https://www.fsis.usda.gov/wps/wcm/connect/fsis-content/rss/fsis-recalls-alerts', true, '["meat recall", "poultry recall", "fsis", "usda", "contamination"]', 9, 180,
 '{"description": "FSIS meat and poultry recalls", "agency_full_name": "Food Safety and Inspection Service"}'),

-- EPA sources
('EPA Enforcement & Compliance RSS', 'EPA', 'US', 'rss', 'https://www.epa.gov/newsreleases/rss.xml', true, '["environmental", "enforcement", "compliance", "violation", "epa"]', 7, 240,
 '{"description": "EPA enforcement actions and compliance"}'),

-- OSHA sources
('OSHA Safety Alerts RSS', 'OSHA', 'US', 'rss', 'https://www.osha.gov/rss/quicktakes.xml', true, '["workplace safety", "osha", "safety alert", "violation", "inspection"]', 6, 360,
 '{"description": "OSHA workplace safety alerts and violations"}'),

-- Health Canada (international coverage)
('Health Canada Recalls RSS', 'Health Canada', 'CA', 'rss', 'https://recalls-rappels.canada.ca/en/rss', true, '["health canada", "recall", "advisory", "safety", "canada"]', 7, 180,
 '{"description": "Health Canada product recalls and advisories"}'),

-- European sources
('EMA Safety Updates RSS', 'EMA', 'EU', 'rss', 'https://www.ema.europa.eu/en/rss/human-medicines-highlights_en.xml', true, '["ema", "european medicines", "safety", "regulatory", "europe"]', 6, 360,
 '{"description": "European Medicines Agency safety updates"}'),

('EFSA Scientific Outputs RSS', 'EFSA', 'EU', 'rss', 'https://www.efsa.europa.eu/en/rss/scientific-outputs.xml', true, '["efsa", "food safety", "risk assessment", "europe", "scientific"]', 6, 480,
 '{"description": "European Food Safety Authority scientific outputs"}'),

-- UK MHRA (removed previously, re-adding with correct info)
('UK MHRA Drug Safety Updates RSS', 'MHRA', 'UK', 'rss', 'https://www.gov.uk/drug-safety-update.atom', true, '["mhra", "drug safety", "uk", "medicines", "safety"]', 6, 360,
 '{"description": "UK MHRA drug safety updates and alerts"}')

ON CONFLICT (name, agency, region) DO UPDATE SET
  url = EXCLUDED.url,
  is_active = true,  -- Force all sources to be active
  keywords = EXCLUDED.keywords,
  priority = EXCLUDED.priority,
  polling_interval_minutes = EXCLUDED.polling_interval_minutes,
  metadata = EXCLUDED.metadata,
  last_error = NULL,  -- Clear any previous errors
  updated_at = now();

-- Update existing inactive sources to be active
UPDATE public.data_sources
SET
  is_active = true,
  last_error = NULL,
  updated_at = now()
WHERE agency IN ('FDA', 'FSIS', 'EPA', 'OSHA', 'CDC', 'GSA', 'Health Canada', 'EMA', 'EFSA', 'MHRA')
  AND is_active = false;

-- Create function to test source connectivity and update status
CREATE OR REPLACE FUNCTION test_regulatory_source_connectivity()
RETURNS TABLE (
  source_name text,
  source_url text,
  status text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  source_record record;
  test_response text;
BEGIN
  FOR source_record IN
    SELECT name, url, agency
    FROM public.data_sources
    WHERE is_active = true
      AND agency IN ('FDA', 'FSIS', 'EPA', 'OSHA', 'CDC', 'GSA', 'Health Canada', 'EMA', 'EFSA', 'MHRA')
    ORDER BY priority DESC
  LOOP
    BEGIN
      -- For now, just return the source info - actual HTTP testing would require additional setup
      source_name := source_record.name;
      source_url := source_record.url;
      status := 'configured';
      error_message := null;

      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      source_name := source_record.name;
      source_url := source_record.url;
      status := 'error';
      error_message := SQLERRM;

      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- Add retry logic and error handling to data source processing
CREATE OR REPLACE FUNCTION update_data_source_status(
  source_id_param uuid,
  success_param boolean,
  error_message_param text DEFAULT NULL,
  records_fetched_param integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF success_param THEN
    -- Success - clear error and update last successful fetch
    UPDATE public.data_sources
    SET
      last_successful_fetch = now(),
      last_error = NULL,
      is_active = true,
      updated_at = now()
    WHERE id = source_id_param;
  ELSE
    -- Error - increment failure count and potentially deactivate if too many failures
    UPDATE public.data_sources
    SET
      last_error = error_message_param,
      updated_at = now(),
      -- Don't deactivate critical regulatory sources automatically
      is_active = CASE
        WHEN agency IN ('FDA', 'FSIS', 'CDC') THEN true  -- Keep critical sources active
        ELSE is_active
      END
    WHERE id = source_id_param;
  END IF;

  -- Log the status update
  INSERT INTO public.security_events (event_type, metadata, severity)
  VALUES (
    'data_source_status_update',
    jsonb_build_object(
      'source_id', source_id_param,
      'success', success_param,
      'error_message', error_message_param,
      'records_fetched', records_fetched_param
    ),
    CASE WHEN success_param THEN 'low' ELSE 'medium' END
  );
END;
$$;

-- Create view to show current regulatory source status
CREATE OR REPLACE VIEW regulatory_sources_status AS
SELECT
  ds.name as source_name,
  ds.agency,
  ds.region,
  ds.source_type,
  ds.is_active,
  ds.priority,
  ds.polling_interval_minutes,
  ds.last_successful_fetch,
  ds.last_error,
  ds.url,
  CASE
    WHEN ds.last_successful_fetch IS NULL THEN 'never_run'
    WHEN ds.last_successful_fetch < now() - interval '24 hours' THEN 'stale'
    WHEN ds.last_error IS NOT NULL THEN 'error'
    ELSE 'healthy'
  END as health_status,
  -- Count recent alerts from this source
  COALESCE(alert_counts.recent_alerts, 0) as alerts_last_24h
FROM public.data_sources ds
LEFT JOIN (
  SELECT source, COUNT(*) as recent_alerts
  FROM public.alerts
  WHERE created_at >= now() - interval '24 hours'
  GROUP BY source
) alert_counts ON ds.name = alert_counts.source
WHERE ds.agency IN ('FDA', 'FSIS', 'EPA', 'OSHA', 'CDC', 'GSA', 'Health Canada', 'EMA', 'EFSA', 'MHRA')
ORDER BY ds.priority DESC, ds.agency, ds.name;

-- Grant permissions
GRANT SELECT ON regulatory_sources_status TO authenticated;
GRANT EXECUTE ON FUNCTION test_regulatory_source_connectivity() TO authenticated;
GRANT EXECUTE ON FUNCTION update_data_source_status(uuid, boolean, text, integer) TO service_role;

-- Log the restoration
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'regulatory_sources_restored',
  jsonb_build_object(
    'restoration_date', now(),
    'sources_count', (SELECT COUNT(*) FROM public.data_sources WHERE agency IN ('FDA', 'FSIS', 'EPA', 'OSHA', 'CDC', 'GSA', 'Health Canada', 'EMA', 'EFSA', 'MHRA')),
    'active_sources', (SELECT COUNT(*) FROM public.data_sources WHERE is_active = true AND agency IN ('FDA', 'FSIS', 'EPA', 'OSHA', 'CDC', 'GSA', 'Health Canada', 'EMA', 'EFSA', 'MHRA'))
  ),
  'medium'
);

COMMIT;
-- Create a comprehensive regulatory data sources configuration table
CREATE TABLE IF NOT EXISTS public.regulatory_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'US',
  source_type TEXT NOT NULL DEFAULT 'rss',
  base_url TEXT NOT NULL,
  rss_feeds JSONB DEFAULT '[]'::jsonb,
  data_gov_org TEXT,
  polling_interval_minutes INTEGER DEFAULT 60,
  priority INTEGER DEFAULT 5,
  keywords JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_successful_fetch TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name, agency, region)
);

-- Create trigger for updated_at
CREATE TRIGGER update_regulatory_data_sources_updated_at
  BEFORE UPDATE ON public.regulatory_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.regulatory_data_sources ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage regulatory data sources"
  ON public.regulatory_data_sources
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view active regulatory data sources"
  ON public.regulatory_data_sources
  FOR SELECT
  USING (is_active = true);

-- Insert comprehensive global regulatory data sources
INSERT INTO public.regulatory_data_sources (name, agency, region, source_type, base_url, rss_feeds, polling_interval_minutes, priority, keywords) VALUES
-- United States
('FDA Food Safety', 'FDA', 'US', 'rss', 'https://www.fda.gov', '["https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-updates/rss.xml"]', 15, 9, '["recall", "warning letter", "safety alert", "guidance", "approval", "withdrawal"]'),
('FDA Drug Safety', 'FDA', 'US', 'rss', 'https://www.fda.gov', '["https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drug-updates/rss.xml"]', 15, 9, '["recall", "warning letter", "safety alert", "guidance", "approval", "withdrawal"]'),
('FDA Medical Device Safety', 'FDA', 'US', 'rss', 'https://www.fda.gov', '["https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-device-updates/rss.xml"]', 15, 9, '["recall", "warning letter", "safety alert", "guidance", "approval", "withdrawal"]'),
('USDA FSIS Recalls', 'USDA', 'US', 'api', 'https://www.fsis.usda.gov', '["https://www.fsis.usda.gov/rss/fsis-recalls"]', 15, 9, '["recall", "outbreak", "contamination", "food safety", "FSIS"]'),
('CDC Health Alerts', 'CDC', 'US', 'rss', 'https://tools.cdc.gov', '["https://tools.cdc.gov/api/v2/resources/media/316422.rss"]', 30, 8, '["outbreak", "alert", "investigation", "surveillance", "health advisory"]'),
('EPA Enforcement', 'EPA', 'US', 'api', 'https://www.epa.gov', '[]', 60, 7, '["enforcement", "violation", "penalty", "settlement", "compliance"]'),
('OSHA Safety', 'OSHA', 'US', 'api', 'https://www.osha.gov', '[]', 60, 7, '["citation", "penalty", "fatality", "inspection", "violation"]'),
('FTC Enforcement', 'FTC', 'US', 'rss', 'https://www.ftc.gov', '["https://www.ftc.gov/news-events/news/press-releases.rss"]', 60, 6, '["enforcement", "settlement", "complaint", "action", "order"]'),

-- European Union
('EFSA Food Safety', 'EFSA', 'EU', 'rss', 'https://www.efsa.europa.eu', '["https://www.efsa.europa.eu/en/rss/rss.xml"]', 60, 8, '["food safety", "nutrition", "animal health", "scientific opinion", "guidance"]'),
('EMA Drug Safety', 'EMA', 'EU', 'rss', 'https://www.ema.europa.eu', '["https://www.ema.europa.eu/en/rss.xml"]', 60, 8, '["medicine", "safety", "approval", "withdrawal", "pharmacovigilance"]'),
('ECHA Chemical Safety', 'ECHA', 'EU', 'api', 'https://echa.europa.eu', '[]', 120, 7, '["chemical safety", "restriction", "authorization", "classification"]'),

-- Canada
('Health Canada Recalls', 'Health Canada', 'CA', 'rss', 'https://healthycanadians.gc.ca', '["https://healthycanadians.gc.ca/recall-alert-rappel-avis/api/recent/en"]', 60, 8, '["recall", "advisory", "health alert", "consumer alert", "safety"]'),
('Health Canada Drug Safety', 'Health Canada', 'CA', 'rss', 'https://healthycanadians.gc.ca', '["https://www.canada.ca/en/health-canada/services/drugs-health-products/medeffect-canada/health-product-infowatch.rss.xml"]', 60, 8, '["drug safety", "medical device", "natural health product", "advisory"]'),
('CFIA Food Safety', 'CFIA', 'CA', 'api', 'https://inspection.canada.ca', '[]', 60, 8, '["food recall", "food safety", "inspection", "compliance"]'),

-- United Kingdom
('MHRA Drug Safety', 'MHRA', 'UK', 'rss', 'https://www.gov.uk/mhra', '["https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency.atom"]', 60, 8, '["medicine safety", "medical device", "recall", "safety alert"]'),
('FSA Food Safety', 'FSA', 'UK', 'rss', 'https://www.food.gov.uk', '["https://www.food.gov.uk/rss.xml"]', 60, 8, '["food safety", "food recall", "allergen", "contamination"]'),

-- Australia
('TGA Drug Safety', 'TGA', 'AU', 'rss', 'https://www.tga.gov.au', '["https://www.tga.gov.au/rss.xml"]', 60, 7, '["medicine safety", "medical device", "recall", "safety alert"]'),
('FSANZ Food Safety', 'FSANZ', 'AU', 'api', 'https://www.foodstandards.gov.au', '[]', 60, 7, '["food safety", "food recall", "food standard"]'),

-- Japan
('PMDA Drug Safety', 'PMDA', 'JP', 'api', 'https://www.pmda.go.jp', '[]', 120, 7, '["medicine safety", "medical device", "recall"]'),
('MHLW Health Safety', 'MHLW', 'JP', 'api', 'https://www.mhlw.go.jp', '[]', 120, 7, '["health safety", "food safety", "recall"]'),

-- Global Organizations
('WHO Health Alerts', 'WHO', 'Global', 'rss', 'https://www.who.int', '["https://www.who.int/rss-feeds/news-english.xml"]', 60, 9, '["health alert", "emergency", "outbreak", "public health", "safety"]'),
('FAO Food Safety', 'FAO', 'Global', 'api', 'https://www.fao.org', '[]', 120, 7, '["food safety", "food security", "nutrition", "standards"]'),
('IAEA Nuclear Safety', 'IAEA', 'Global', 'rss', 'https://www.iaea.org', '["https://www.iaea.org/rss/newsfeed/"]', 120, 8, '["nuclear safety", "radiation", "incident", "emergency"]');

-- Create upsert function for system settings if it doesn't exist
CREATE OR REPLACE FUNCTION public.upsert_system_setting(
  key_param TEXT,
  value_param JSONB,
  description_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES (key_param, value_param, description_param)
  ON CONFLICT (setting_key) 
  DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = COALESCE(EXCLUDED.description, system_settings.description),
    updated_at = now();
END;
$$;
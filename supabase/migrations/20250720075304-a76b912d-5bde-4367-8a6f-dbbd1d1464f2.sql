-- Create data sources table to manage all regulatory feeds
CREATE TABLE public.data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  agency TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'rss', 'api', 'scraping'
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  fetch_interval INTEGER DEFAULT 3600, -- seconds
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage data sources" 
ON public.data_sources 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view active data sources" 
ON public.data_sources 
FOR SELECT 
USING (is_active = true);

-- Insert the regulatory data sources from your list
INSERT INTO public.data_sources (name, agency, source_type, url, metadata) VALUES
-- FDA Sources
('FDA Food Recalls API', 'FDA', 'api', 'https://api.fda.gov/food/enforcement.json', '{"description": "FDA Food Recalls and Enforcement Actions"}'),
('FDA Drug Recalls API', 'FDA', 'api', 'https://api.fda.gov/drug/enforcement.json', '{"description": "FDA Drug Recalls and Enforcement Actions"}'),
('FDA Device Recalls API', 'FDA', 'api', 'https://api.fda.gov/device/enforcement.json', '{"description": "FDA Medical Device Recalls"}'),
('FDA MedWatch Safety Alerts', 'FDA', 'rss', 'https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program/medwatch-rss-feed', '{"description": "FDA MedWatch Safety Information and Adverse Event Reporting"}'),
('FDA Food Allergies RSS', 'FDA', 'rss', 'https://feeder.co/discover/5f94cb0b5c/fda-gov-about-fda-contact-fda-stay-informed-rss-feeds-food-allergies-rss-xml', '{"description": "FDA Food Allergies Alerts"}'),

-- USDA/FSIS Sources
('FSIS Recall API', 'FSIS', 'api', 'https://www.fsis.usda.gov/science-data/developer-resources/recall-api', '{"description": "FSIS Food Safety Recalls and Public Health Alerts"}'),
('USDA NASS API', 'USDA', 'api', 'https://quickstats.nass.usda.gov/api', '{"description": "USDA National Agricultural Statistics Service"}'),

-- EPA Sources  
('EPA Envirofacts API', 'EPA', 'api', 'https://www.epa.gov/enviro/envirofacts-data-service-api', '{"description": "EPA Environmental Data"}'),
('EPA ECHO API', 'EPA', 'api', 'https://echo.epa.gov/tools/web-services', '{"description": "EPA Enforcement and Compliance History"}'),

-- CDC Sources
('CDC MMWR RSS', 'CDC', 'rss', 'https://www.cdc.gov/mmwr/rss/rss.html', '{"description": "CDC Morbidity and Mortality Weekly Report"}'),

-- Federal Register Sources
('Federal Register FDA Rules', 'Federal Register', 'rss', 'https://www.federalregister.gov/api/v1/articles.rss?conditions[agencies][]=food-and-drug-administration', '{"description": "Federal Register FDA Rules and Regulations"}'),
('Federal Register EPA Rules', 'Federal Register', 'rss', 'https://www.federalregister.gov/api/v1/articles.rss?conditions[agencies][]=environmental-protection-agency', '{"description": "Federal Register EPA Rules and Regulations"}'),

-- Other Sources
('Food Safety News RSS', 'Food Safety', 'rss', 'https://www.food-safety.com/rss', '{"description": "Food Safety News and Updates"}'),
('Drugs.com Recalls RSS', 'Drugs.com', 'rss', 'https://www.drugs.com/rss.html', '{"description": "Drug Recalls and Safety Information"}')
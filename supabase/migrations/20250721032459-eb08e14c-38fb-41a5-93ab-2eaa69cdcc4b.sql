-- Add missing columns to alerts table for enhanced data pipeline
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS agency text,
ADD COLUMN IF NOT EXISTS region text DEFAULT 'US';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alerts_agency ON public.alerts(agency);
CREATE INDEX IF NOT EXISTS idx_alerts_region ON public.alerts(region);

-- Update existing alerts to set default values
UPDATE public.alerts 
SET agency = COALESCE(agency, source),
    region = COALESCE(region, 'US')
WHERE agency IS NULL OR region IS NULL;
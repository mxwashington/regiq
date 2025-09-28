-- Backup the rows you're about to delete
CREATE TABLE IF NOT EXISTS public.alerts_archive AS
SELECT * FROM public.alerts
WHERE source IN ('CDC Health Alerts', 'WHO', 'WHO Health Alerts', 'MHRA', 'Health_Canada');

-- Now delete them
DELETE FROM public.alerts
WHERE source IN ('CDC Health Alerts', 'WHO', 'WHO Health Alerts', 'MHRA', 'Health_Canada');
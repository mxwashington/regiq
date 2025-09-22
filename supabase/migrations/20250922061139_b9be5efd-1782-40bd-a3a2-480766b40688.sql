-- Remove the fake GSA sample alerts I just added
DELETE FROM public.alerts 
WHERE source IN ('GSA Contract Opportunities', 'GSA Schedules API', 'GSA Federal Acquisition Service') 
   AND agency = 'GSA';
-- Remove non-US sources but keep Global sources
DELETE FROM public.data_sources 
WHERE region NOT IN ('US', 'Global');
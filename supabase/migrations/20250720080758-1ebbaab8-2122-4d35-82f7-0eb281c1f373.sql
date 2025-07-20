-- Remove all dummy/test data from alerts table
DELETE FROM public.alerts 
WHERE 
  -- Remove data marked with TEST DATA prefix
  summary LIKE '[TEST DATA]%'
  -- Remove data from test sources
  OR source IN ('Test Agency', 'Demo Source', 'Sample', 'Demo Agency', 'Test Source')
  -- Remove data with test/demo/sample keywords in title
  OR title ILIKE '%test%' 
  OR title ILIKE '%demo%' 
  OR title ILIKE '%sample%'
  OR title ILIKE '%dummy%'
  OR title ILIKE '%placeholder%'
  OR title ILIKE '%example%'
  -- Remove data with test/demo/sample keywords in summary (including our marked ones)
  OR summary ILIKE '%test%'
  OR summary ILIKE '%demo%'
  OR summary ILIKE '%sample%'
  OR summary ILIKE '%dummy%'
  OR summary ILIKE '%placeholder%'
  OR summary ILIKE '%example%'
  -- Remove data from obviously fake external URLs
  OR external_url LIKE '%example.com%'
  OR external_url LIKE '%test.%'
  OR external_url LIKE '%demo.%';
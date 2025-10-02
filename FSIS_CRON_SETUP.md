# FSIS Enhanced Ingestion - Cron Setup Guide

This guide shows how to schedule the FSIS Enhanced Ingestion function to run every 6 hours using Supabase cron jobs.

## Prerequisites

1. Enable required Supabase extensions:
   - `pg_cron` - For scheduling
   - `pg_net` - For HTTP requests

## Step 1: Enable Extensions

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

## Step 2: Schedule FSIS Ingestion (Every 6 Hours)

```sql
SELECT cron.schedule(
  'fsis-enhanced-ingestion-6h',
  '0 */6 * * *', -- Every 6 hours at :00
  $$
  SELECT net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/fsis-enhanced-ingestion',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);
```

## Step 3: Verify Job Creation

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname = 'fsis-enhanced-ingestion-6h';
```

Expected output:
```
jobid | jobname                        | schedule      | active | nodename
------|--------------------------------|---------------|--------|----------
23    | fsis-enhanced-ingestion-6h    | 0 */6 * * *   | t      | localhost
```

## Step 4: Manual Trigger (for testing)

```sql
SELECT cron.schedule(
  'fsis-test-trigger',
  '* * * * *', -- Run once immediately
  $$
  SELECT net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/fsis-enhanced-ingestion',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
    body := '{"test_mode": true}'::jsonb
  ) AS request_id;
  $$
);

-- Wait 1 minute, then delete test job
SELECT cron.unschedule('fsis-test-trigger');
```

## Step 5: Monitor Job Execution

```sql
-- View recent job runs
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'fsis-enhanced-ingestion-6h'
)
ORDER BY start_time DESC
LIMIT 10;
```

## Step 6: Verify FSIS Data Ingestion

```sql
-- Check latest FSIS alerts
SELECT 
  title,
  urgency,
  published_date,
  created_at,
  external_id
FROM alerts
WHERE source = 'FSIS'
ORDER BY published_date DESC
LIMIT 10;

-- Check data freshness
SELECT 
  source_name,
  last_successful_fetch,
  fetch_status,
  records_fetched,
  error_message,
  EXTRACT(EPOCH FROM (NOW() - last_successful_fetch)) / 3600 AS hours_since_last_fetch
FROM data_freshness
WHERE source_name = 'FSIS';
```

## Acceptance Criteria Verification

### ✅ Fresh data every 6 hours
```sql
SELECT 
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - last_successful_fetch)) / 3600 < 12 THEN '✅ FRESH (<12h)'
    ELSE '❌ STALE (>12h)'
  END AS freshness_status,
  last_successful_fetch,
  records_fetched
FROM data_freshness
WHERE source_name = 'FSIS';
```

Expected: `✅ FRESH (<12h)`

### ✅ Zero duplicates
```sql
SELECT 
  COUNT(*) AS total_records,
  COUNT(DISTINCT external_id) AS unique_records,
  COUNT(*) - COUNT(DISTINCT external_id) AS duplicates
FROM alerts
WHERE source = 'FSIS';
```

Expected: `duplicates = 0`

### ✅ API preference with RSS fallback
Check edge function logs:
```
Look for log entries showing:
- "Attempting FSIS API fetch..."
- OR "Using RSS fallback..." (if API failed)
```

### ✅ Inline test produces valid records
Run from Admin Dashboard > Testing tab:
1. Click "FSIS" test button
2. Verify at least 3 records with:
   - Valid `title`
   - Valid `description`
   - Valid `published_date`
   - Valid `recall_number` or `case_id`
   - Freshness <12h

## Troubleshooting

### Job not running
```sql
-- Check if job is active
SELECT * FROM cron.job WHERE jobname = 'fsis-enhanced-ingestion-6h';

-- If inactive, reactivate:
UPDATE cron.job SET active = true WHERE jobname = 'fsis-enhanced-ingestion-6h';
```

### No new data
```sql
-- Check for errors in job runs
SELECT 
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'fsis-enhanced-ingestion-6h'
)
ORDER BY start_time DESC
LIMIT 5;

-- Check edge function logs at:
-- https://supabase.com/dashboard/project/piyikxxgoekawboitrzz/functions/fsis-enhanced-ingestion/logs
```

### API vs RSS source verification
```sql
SELECT 
  full_content::jsonb->>'source_type' AS ingestion_method,
  COUNT(*) AS count,
  MAX(created_at) AS latest_ingestion
FROM alerts
WHERE source = 'FSIS'
GROUP BY full_content::jsonb->>'source_type'
ORDER BY latest_ingestion DESC;
```

Expected to see primarily `FSIS` entries (from API), with occasional `FSIS` entries (from RSS fallback).

## Unschedule Job (if needed)

```sql
SELECT cron.unschedule('fsis-enhanced-ingestion-6h');
```

## Notes

- **Freshness Threshold**: FSIS data is considered stale if >12 hours old
- **Deduplication**: Uses `recall_number` or `case_id` as unique identifier
- **Fallback Logic**: Automatically switches to RSS if API fails or returns no data
- **Test Mode**: Set `test_mode: true` in request body to see sample records without inserting to production table
- **Rate Limiting**: Not applicable (FSIS API and RSS have no documented rate limits)

## Related Files

- Edge Function: `supabase/functions/fsis-enhanced-ingestion/index.ts`
- Testing Panel: `src/components/admin/DataSourceTestingPanel.tsx`
- Health Check: `supabase/functions/source-health-check/index.ts`

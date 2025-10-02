# CDC Enhanced Ingestion - Cron Setup Guide

## Overview
This document provides step-by-step instructions for setting up automated CDC (EID + MMWR) data ingestion via Supabase cron jobs.

## Prerequisites
- Supabase project with `pg_cron` and `pg_net` extensions enabled
- CDC enhanced ingestion edge function deployed (`cdc-enhanced-ingestion`)

## Step 1: Enable Required Extensions

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Step 2: Schedule CDC Ingestion (Daily at 2 AM UTC)

```sql
SELECT cron.schedule(
  'cdc-daily-ingestion',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/cdc-enhanced-ingestion',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
        body:='{"test_mode": false}'::jsonb
    ) as request_id;
  $$
);
```

## Step 3: Verify Cron Job Status

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Check CDC ingestion job specifically
SELECT * FROM cron.job WHERE jobname = 'cdc-daily-ingestion';
```

## Step 4: Monitor CDC Ingestion Runs

```sql
-- View recent CDC ingestion runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cdc-daily-ingestion')
ORDER BY start_time DESC 
LIMIT 10;

-- Check CDC health logs
SELECT * FROM source_health_logs 
WHERE source_name = 'CDC' 
ORDER BY checked_at DESC 
LIMIT 20;

-- View recent CDC alerts
SELECT 
  id, 
  title, 
  urgency, 
  published_date, 
  relevance_score,
  created_at
FROM alerts 
WHERE source = 'CDC' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Step 5: Adjust Cron Frequency (Optional)

### Change to Every 12 Hours
```sql
SELECT cron.unschedule('cdc-daily-ingestion');

SELECT cron.schedule(
  'cdc-twice-daily-ingestion',
  '0 2,14 * * *', -- 2 AM and 2 PM UTC
  $$
  SELECT
    net.http_post(
        url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/cdc-enhanced-ingestion',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
        body:='{"test_mode": false}'::jsonb
    ) as request_id;
  $$
);
```

## Step 6: Manual Test Run

```sql
-- Trigger an immediate test run
SELECT
  net.http_post(
      url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/cdc-enhanced-ingestion',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
      body:='{"test_mode": true}'::jsonb
  ) as request_id;
```

## Troubleshooting

### Job Not Running
```sql
-- Check if cron extension is properly installed
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Verify job is scheduled
SELECT * FROM cron.job WHERE jobname LIKE '%cdc%';
```

### No Alerts Being Inserted
```sql
-- Check health logs for errors
SELECT * FROM source_health_logs 
WHERE source_name = 'CDC' AND status = 'error' 
ORDER BY checked_at DESC;

-- Verify test table has data
SELECT COUNT(*) FROM cdc_test;
```

### Adjust Volume Expectations
Expected baseline (post-July 2025 FoodNet reduction):
- **4-6 food-related alerts per week** (down from ~20-30)
- Freshness: All alerts < 72 hours old

```sql
-- Check weekly CDC alert volume
SELECT 
  DATE_TRUNC('week', published_date) as week,
  COUNT(*) as alert_count
FROM alerts 
WHERE source = 'CDC' 
  AND published_date > NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

## Next Steps
1. Monitor first week of ingestion for volume trends
2. Adjust relevance scoring thresholds if needed
3. Set up alerting for failed ingestion runs
4. Review food keyword list quarterly

## Cron Schedule Reference
- `0 2 * * *` = Daily at 2 AM UTC
- `0 */6 * * *` = Every 6 hours
- `0 */12 * * *` = Every 12 hours
- `0 2,14 * * *` = 2 AM and 2 PM UTC

## Support
For issues or questions, check:
- Edge function logs: [Supabase Dashboard](https://supabase.com/dashboard/project/piyikxxgoekawboitrzz/functions/cdc-enhanced-ingestion/logs)
- Health logs table: `source_health_logs`
- CDC test table: `cdc_test`

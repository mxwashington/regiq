# FDA Enforcement API Cron Job Setup

## Overview
This document provides SQL commands to set up automated FDA enforcement data syncing every 6 hours.

## Prerequisites
1. Enable `pg_cron` extension in your Supabase project
2. Enable `pg_net` extension in your Supabase project

## Setup Instructions

### Step 1: Enable Required Extensions
Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Create the Cron Job
Run this SQL to schedule FDA enforcement sync every 6 hours:

```sql
-- Remove existing job if it exists
SELECT cron.unschedule('fda-enforcement-sync');

-- Create new job running every 6 hours
SELECT cron.schedule(
  'fda-enforcement-sync',
  '0 */6 * * *', -- Every 6 hours at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/fetch-openfda-enforcement',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94'
      ),
      body := jsonb_build_object('days', 30)
    ) as request_id;
  $$
);
```

### Step 3: Verify the Job
Check that the job was created successfully:

```sql
SELECT * FROM cron.job WHERE jobname = 'fda-enforcement-sync';
```

### Step 4: View Job Run History
Monitor the job execution:

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'fda-enforcement-sync')
ORDER BY start_time DESC
LIMIT 10;
```

## Manual Trigger
To manually trigger the FDA enforcement sync:

```sql
SELECT
  net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/fetch-openfda-enforcement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94'
    ),
    body := jsonb_build_object('days', 30)
  ) as request_id;
```

## Schedule Options
You can modify the cron schedule as needed:
- `'0 */6 * * *'` - Every 6 hours at minute 0
- `'0 */4 * * *'` - Every 4 hours at minute 0
- `'0 */12 * * *'` - Every 12 hours at minute 0
- `'0 0 * * *'` - Once daily at midnight
- `'0 0,6,12,18 * * *'` - At 12am, 6am, 12pm, 6pm

## Monitoring
Monitor sync performance via the dashboard:
- Check `data_freshness` table for last sync times
- Review `api_health_checks` table for rate limit usage
- Check edge function logs in Supabase dashboard

## Acceptance Criteria Verification

### 1. Fresh Data (<24h old)
```sql
SELECT 
  source_name,
  last_successful_fetch,
  EXTRACT(EPOCH FROM (NOW() - last_successful_fetch))/3600 as hours_old
FROM data_freshness
WHERE source_name LIKE 'FDA%Enforcement%'
ORDER BY last_successful_fetch DESC;
```

### 2. Success Rate >95%
```sql
SELECT 
  source_name,
  fetch_status,
  COUNT(*) as attempts,
  ROUND(100.0 * SUM(CASE WHEN fetch_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM data_freshness
WHERE source_name LIKE 'FDA%Enforcement%'
  AND last_attempt > NOW() - INTERVAL '7 days'
GROUP BY source_name, fetch_status;
```

### 3. No Duplicates
```sql
SELECT 
  external_id,
  source,
  COUNT(*) as duplicate_count
FROM alerts
WHERE source LIKE 'FDA%Enforcement%'
GROUP BY external_id, source
HAVING COUNT(*) > 1;
```

### 4. Required Fields Present
```sql
SELECT 
  COUNT(*) as total_alerts,
  SUM(CASE WHEN title IS NULL OR title = '' THEN 1 ELSE 0 END) as missing_title,
  SUM(CASE WHEN summary IS NULL OR summary = '' THEN 1 ELSE 0 END) as missing_summary,
  SUM(CASE WHEN published_date IS NULL THEN 1 ELSE 0 END) as missing_date
FROM alerts
WHERE source LIKE 'FDA%Enforcement%'
  AND created_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Job Not Running
```sql
-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check if job is scheduled
SELECT * FROM cron.job WHERE jobname = 'fda-enforcement-sync';
```

### Rate Limit Issues
```sql
-- Check recent API call count
SELECT 
  api_name,
  COUNT(*) as calls_last_hour,
  MAX(checked_at) as last_call
FROM api_health_checks
WHERE api_name = 'FDA'
  AND checked_at > NOW() - INTERVAL '1 hour'
GROUP BY api_name;
```

### Circuit Breaker Status
Check the edge function logs in Supabase dashboard for circuit breaker state messages.

## Support
For issues or questions, check:
1. Edge function logs: https://supabase.com/dashboard/project/piyikxxgoekawboitrzz/functions/fetch-openfda-enforcement/logs
2. Database logs for error tracking
3. `data_freshness` table for sync status

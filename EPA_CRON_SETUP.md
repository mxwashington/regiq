# EPA Enhanced Ingestion - Cron Job Setup

This guide explains how to schedule the EPA enhanced ingestion function to run every 24 hours using Supabase's cron functionality.

## Overview

The EPA enhanced ingestion combines two data sources:
1. **EPA ECHO API**: Environmental Enforcement & Compliance History Online
2. **Regulations.gov API**: Federal EPA regulations and rules

## Prerequisites

### 1. Enable pg_cron Extension

First, ensure the `pg_cron` extension is enabled in your Supabase project:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 2. Configure API Keys

The EPA ingestion requires two API keys as Supabase secrets:

- `EPA_ECHO_API_KEY` (optional but recommended for ECHO)
- `REGULATIONS_GOV_API_KEY` (required for Regulations.gov)

To add these secrets:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add both API keys

**Getting API Keys:**
- EPA ECHO: Request at https://echo.epa.gov/tools/web-services
- Regulations.gov: Request at https://open.gsa.gov/api/regulationsgov/

## Cron Job Setup

### Create the Cron Job

Run this SQL in your Supabase SQL Editor to schedule EPA ingestion every 24 hours at midnight UTC:

```sql
-- Schedule EPA enhanced ingestion to run daily at midnight UTC
SELECT cron.schedule(
  'epa-enhanced-ingestion-daily',
  '0 0 * * *', -- Run at midnight UTC every day
  $$
  SELECT net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/epa-enhanced-ingestion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94'
    ),
    body := jsonb_build_object(
      'days', 30,
      'test_mode', false
    )
  );
  $$
);
```

### Alternative Schedules

If you want to run more or less frequently:

**Every 12 hours:**
```sql
SELECT cron.schedule(
  'epa-enhanced-ingestion-12h',
  '0 */12 * * *',
  $$ /* same net.http_post as above */ $$
);
```

**Every 6 hours:**
```sql
SELECT cron.schedule(
  'epa-enhanced-ingestion-6h',
  '0 */6 * * *',
  $$ /* same net.http_post as above */ $$
);
```

**Weekly (Sundays at midnight):**
```sql
SELECT cron.schedule(
  'epa-enhanced-ingestion-weekly',
  '0 0 * * 0',
  $$ /* same net.http_post as above */ $$
);
```

## Verify Cron Job

Check that your cron job is scheduled:

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'epa-%')
ORDER BY start_time DESC 
LIMIT 10;
```

## Monitor Ingestion

### View Source Health Logs

```sql
-- Check EPA ingestion health
SELECT 
  source_name,
  status,
  last_check,
  records_found,
  error_message,
  metadata
FROM source_health_logs
WHERE source_name = 'EPA'
ORDER BY last_check DESC
LIMIT 5;
```

### View Recent EPA Alerts

```sql
-- Check recently ingested EPA alerts
SELECT 
  title,
  source,
  urgency,
  published_date,
  external_id,
  created_at
FROM alerts
WHERE source = 'EPA'
ORDER BY published_date DESC
LIMIT 10;
```

### Check Food Relevance Filtering

```sql
-- View EPA alerts with high food relevance
SELECT 
  title,
  urgency,
  published_date,
  (full_content::jsonb->'relevance_score')::int as relevance_score
FROM alerts
WHERE source = 'EPA'
  AND (full_content::jsonb->'relevance_score')::int >= 60
ORDER BY published_date DESC
LIMIT 10;
```

## Manual Testing

Before enabling the cron job, test the function manually:

### Via Dashboard
1. Go to Admin → Data Pipeline
2. Find "EPA (ECHO + Regulations.gov)"
3. Click "Run Inline Test"
4. Check the results

### Via SQL
```sql
-- Manually trigger EPA ingestion (test mode)
SELECT net.http_post(
  url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/epa-enhanced-ingestion',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94'
  ),
  body := jsonb_build_object(
    'days', 7,
    'test_mode', true
  )
);
```

## Troubleshooting

### No Records Found
- Verify API keys are configured correctly
- Check if ECHO API key is valid: https://echo.epa.gov/tools/web-services
- Verify Regulations.gov API key: https://api.regulations.gov/v4/documents

### Rate Limiting Errors
- ECHO has a 1000 requests/hour limit
- Regulations.gov has similar limits
- The function includes automatic retry with exponential backoff

### Authentication Errors
- Ensure `EPA_ECHO_API_KEY` secret is set (optional for ECHO)
- Ensure `REGULATIONS_GOV_API_KEY` secret is set (required for Regulations.gov)
- API keys should be added in Supabase dashboard under Settings → Edge Functions → Secrets

### Low Food Relevance Scores
- The function filters for food-related keywords automatically
- Check the `relevance_score` in alert metadata
- Scores above 60 are considered HIGH relevance
- Scores 30-60 are MEDIUM relevance
- Scores below 30 are LOW relevance

## Unschedule Cron Job

If you need to disable the cron job:

```sql
-- Remove the EPA cron job
SELECT cron.unschedule('epa-enhanced-ingestion-daily');
```

## Next Steps

1. ✅ Set up API keys in Supabase secrets
2. ✅ Run manual test via Data Pipeline dashboard
3. ✅ Verify at least 5 records with valid fields
4. ✅ Create the cron job using the SQL above
5. ✅ Monitor source_health_logs for successful runs
6. ✅ Check that EPA alerts appear in the dashboard

## Support

- EPA ECHO API Documentation: https://echo.epa.gov/tools/web-services
- Regulations.gov API Documentation: https://open.gsa.gov/api/regulationsgov/
- Supabase Cron Documentation: https://supabase.com/docs/guides/database/extensions/pg_cron

-- Temporarily unschedule all automated cron jobs to prevent sample data insertion
SELECT cron.unschedule('regulatory-data-pipeline');
SELECT cron.unschedule('rss-alert-scraper');
SELECT cron.unschedule('regulatory-feeds-scraper');
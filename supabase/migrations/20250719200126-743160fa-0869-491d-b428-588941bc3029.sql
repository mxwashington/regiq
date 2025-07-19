
-- Clean up the cache and logs to start fresh
DELETE FROM public.search_cache WHERE cache_key = 'rss_feeds_all';
DELETE FROM public.rss_feed_logs WHERE created_at < NOW() - INTERVAL '1 hour';

-- Verify the tables are clean
SELECT COUNT(*) as cache_count FROM public.search_cache WHERE cache_key = 'rss_feeds_all';
SELECT COUNT(*) as recent_logs FROM public.rss_feed_logs WHERE created_at > NOW() - INTERVAL '1 hour';

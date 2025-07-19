-- Enable Row Level Security on search_cache table
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

-- Allow system/service role to manage cache entries
CREATE POLICY "System can manage search cache" ON public.search_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read cache entries (for their searches)
CREATE POLICY "Users can read search cache" ON public.search_cache
FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to read cache entries (for public searches)
CREATE POLICY "Anonymous can read search cache" ON public.search_cache
FOR SELECT
TO anon
USING (true);
-- Fix user_sessions RLS policy to allow anonymous users
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;

-- Create new policy that allows anonymous sessions
CREATE POLICY "Users can manage own sessions and anonymous sessions" 
ON public.user_sessions 
FOR ALL 
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND user_id IS NULL)
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND user_id IS NULL)
);
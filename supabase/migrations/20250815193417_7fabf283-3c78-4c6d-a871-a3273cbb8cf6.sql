-- CRITICAL PRIORITY: Payment and Subscription Data Security
-- Fix RLS policies for subscribers table to prevent unauthorized access

-- Drop existing permissive policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

-- Create strict RLS policies for subscribers table
CREATE POLICY "Users can view own subscription only" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription only" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only authenticated systems (edge functions) can insert subscription data
CREATE POLICY "System can manage subscriptions" 
ON public.subscribers 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Add additional payment security table for sensitive operations
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  stripe_session_id TEXT,
  success BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Strict access control for payment logs
CREATE POLICY "Admins can view payment logs" 
ON public.payment_logs 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert payment logs" 
ON public.payment_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);
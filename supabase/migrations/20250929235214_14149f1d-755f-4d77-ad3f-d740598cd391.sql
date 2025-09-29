-- Purpose: Remove trial functionality (no trials exist in RegIQ)
-- This migration removes all trial-related columns and functions from the database

BEGIN;

-- Drop trial-related columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS trial_starts_at,
DROP COLUMN IF EXISTS trial_ends_at;

-- Delete trial-related functions entirely (not updating them)
DROP FUNCTION IF EXISTS public.get_trial_days_remaining(uuid);
DROP FUNCTION IF EXISTS public.is_trial_expired(uuid);

COMMIT;
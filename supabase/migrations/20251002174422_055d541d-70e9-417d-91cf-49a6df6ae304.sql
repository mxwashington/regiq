-- Update trial users to free tier users
UPDATE profiles 
SET subscription_status = 'free' 
WHERE subscription_status = 'trial';

-- Add comment explaining subscription statuses
COMMENT ON COLUMN profiles.subscription_status IS 'Subscription status: free (active with limited features), active/paid (full access), or admin';
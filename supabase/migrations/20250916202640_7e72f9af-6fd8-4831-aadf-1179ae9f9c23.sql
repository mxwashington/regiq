-- Grant Admin Status and Highest Subscription to marcus@regiq.org
-- This addresses the user's request for proper admin setup

-- First, let's ensure marcus@regiq.org has a profile and admin permissions
DO $$
DECLARE
    marcus_user_id uuid;
BEGIN
    -- Find marcus@regiq.org user ID from auth.users (if exists)
    SELECT id INTO marcus_user_id 
    FROM auth.users 
    WHERE email = 'marcus@regiq.org' 
    LIMIT 1;
    
    IF marcus_user_id IS NOT NULL THEN
        -- Update or insert profile with admin permissions and highest subscription
        INSERT INTO public.profiles (
            user_id, 
            email, 
            full_name, 
            is_admin, 
            role, 
            admin_permissions,
            subscription_plan,
            subscription_status,
            plan_limits
        ) VALUES (
            marcus_user_id,
            'marcus@regiq.org',
            'Marcus Washington',
            true,
            'admin',
            ARRAY['super_admin', 'security_admin', 'billing_admin', 'analytics_admin'],
            'enterprise',
            'active',
            jsonb_build_object(
                'users', -1,
                'suppliers', -1, 
                'api_access', true,
                'facilities', -1,
                'sso_enabled', true,
                'history_months', -1,
                'exports_per_month', -1,
                'queries_per_month', -1,
                'max_daily_alerts', -1
            )
        )
        ON CONFLICT (user_id) DO UPDATE SET
            is_admin = true,
            role = 'admin',
            admin_permissions = ARRAY['super_admin', 'security_admin', 'billing_admin', 'analytics_admin'],
            subscription_plan = 'enterprise',
            subscription_status = 'active',
            plan_limits = jsonb_build_object(
                'users', -1,
                'suppliers', -1,
                'api_access', true,
                'facilities', -1,
                'sso_enabled', true,
                'history_months', -1,
                'exports_per_month', -1,
                'queries_per_month', -1,
                'max_daily_alerts', -1
            ),
            updated_at = now();
            
        RAISE NOTICE 'Updated marcus@regiq.org with admin permissions and enterprise subscription';
        
        -- Also add to subscribers table for enterprise access
        INSERT INTO public.subscribers (
            user_id,
            subscribed,
            subscription_tier,
            stripe_customer_id,
            trial_ends_at
        ) VALUES (
            marcus_user_id,
            true,
            'enterprise',
            'cus_admin_marcus',
            null
        )
        ON CONFLICT (user_id) DO UPDATE SET
            subscribed = true,
            subscription_tier = 'enterprise',
            updated_at = now();
            
    ELSE
        RAISE NOTICE 'No user found with email marcus@regiq.org - user needs to sign up first';
    END IF;
END $$;

-- Create enterprise plan features if they don't exist
INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
('enterprise', 'max_daily_alerts', '"-1"'),
('enterprise', 'api_access', 'true'),
('enterprise', 'advanced_analytics', 'true'),
('enterprise', 'custom_alerts', 'true'),
('enterprise', 'supplier_monitoring', 'true'),
('enterprise', 'compliance_calendar', 'true'),
('enterprise', 'gap_detection', 'true'),
('enterprise', 'regulatory_impact', 'true'),
('enterprise', 'task_management', 'true'),
('enterprise', 'team_management', 'true'),
('enterprise', 'sso_enabled', 'true')
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
    feature_value = EXCLUDED.feature_value;

-- Add user entitlements for marcus@regiq.org 
DO $$
DECLARE
    marcus_user_id uuid;
BEGIN
    SELECT id INTO marcus_user_id 
    FROM auth.users 
    WHERE email = 'marcus@regiq.org' 
    LIMIT 1;
    
    IF marcus_user_id IS NOT NULL THEN
        INSERT INTO public.user_entitlements (
            user_id,
            plan_id,
            status,
            expires_at
        ) VALUES (
            marcus_user_id,
            'enterprise',
            'active',
            null  -- No expiration for admin
        )
        ON CONFLICT (user_id, plan_id) DO UPDATE SET
            status = 'active',
            expires_at = null,
            updated_at = now();
    END IF;
END $$;
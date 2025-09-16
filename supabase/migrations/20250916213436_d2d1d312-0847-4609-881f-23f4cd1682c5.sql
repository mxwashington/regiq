-- Grant Admin Status to marcus@regiq.org (Final Fix)
-- Handle tables that may or may not have unique constraints properly

DO $$
DECLARE
    marcus_user_id uuid;
    user_exists boolean := false;
BEGIN
    -- Find marcus@regiq.org user ID from auth.users (if exists)
    SELECT id INTO marcus_user_id 
    FROM auth.users 
    WHERE email = 'marcus@regiq.org' 
    LIMIT 1;
    
    IF marcus_user_id IS NOT NULL THEN
        user_exists := true;
        
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
        
        -- Handle subscribers table safely (check if record exists first)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscribers' AND table_schema = 'public') THEN
            -- Delete existing record first, then insert new one
            DELETE FROM public.subscribers WHERE user_id = marcus_user_id;
            
            INSERT INTO public.subscribers (
                user_id,
                subscribed,
                subscription_tier,
                stripe_customer_id
            ) VALUES (
                marcus_user_id,
                true,
                'enterprise',
                'cus_admin_marcus'
            );
        END IF;
            
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
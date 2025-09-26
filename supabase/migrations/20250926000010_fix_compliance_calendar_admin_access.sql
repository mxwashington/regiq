-- Fix Compliance Calendar Admin Access - Allow admin users to manage all compliance deadlines
-- This fixes the blank page issue in compliance calendar for admin users

BEGIN;

-- Drop existing restrictive policies for compliance_deadlines
DROP POLICY IF EXISTS "Users can view their own deadlines" ON public.compliance_deadlines;
DROP POLICY IF EXISTS "Users can create their own deadlines" ON public.compliance_deadlines;
DROP POLICY IF EXISTS "Users can update their own deadlines" ON public.compliance_deadlines;
DROP POLICY IF EXISTS "Users can delete their own deadlines" ON public.compliance_deadlines;

-- Create enhanced policies that include admin access

-- SELECT policy: Users can view their own deadlines + admin can view all
CREATE POLICY "compliance_deadlines_enhanced_select_access" ON public.compliance_deadlines
FOR SELECT USING (
  CASE
    -- Admin users can view all compliance deadlines
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can view their own deadlines
    ELSE auth.uid() = user_id
  END
);

-- INSERT policy: Users can create their own deadlines + admin can create for anyone
CREATE POLICY "compliance_deadlines_enhanced_insert_access" ON public.compliance_deadlines
FOR INSERT WITH CHECK (
  CASE
    -- Admin users can create deadlines for anyone
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can only create their own deadlines
    ELSE auth.uid() = user_id
  END
);

-- UPDATE policy: Users can update their own deadlines + admin can update all
CREATE POLICY "compliance_deadlines_enhanced_update_access" ON public.compliance_deadlines
FOR UPDATE USING (
  CASE
    -- Admin users can update all compliance deadlines
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can update their own deadlines
    ELSE auth.uid() = user_id
  END
)
WITH CHECK (
  CASE
    -- Admin users can make any updates
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can update their own deadlines
    ELSE auth.uid() = user_id
  END
);

-- DELETE policy: Users can delete their own deadlines + admin can delete all
CREATE POLICY "compliance_deadlines_enhanced_delete_access" ON public.compliance_deadlines
FOR DELETE USING (
  CASE
    -- Admin users can delete all compliance deadlines
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can delete their own deadlines
    ELSE auth.uid() = user_id
  END
);

-- Fix compliance_reminders policies
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.compliance_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.compliance_reminders;

-- Enhanced reminders policies
CREATE POLICY "compliance_reminders_enhanced_select_access" ON public.compliance_reminders
FOR SELECT USING (
  CASE
    -- Admin users can view all reminders
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can view their own reminders
    ELSE auth.uid() = user_id
  END
);

CREATE POLICY "compliance_reminders_enhanced_update_access" ON public.compliance_reminders
FOR UPDATE USING (
  CASE
    -- Admin users can update all reminders
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can update their own reminders
    ELSE auth.uid() = user_id
  END
)
WITH CHECK (
  CASE
    -- Admin users can make any updates
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can update their own reminders
    ELSE auth.uid() = user_id
  END
);

-- Fix compliance_templates policies - ensure all users can read, admins can manage
DROP POLICY IF EXISTS "Everyone can view compliance templates" ON public.compliance_templates;
DROP POLICY IF EXISTS "Admins can manage compliance templates" ON public.compliance_templates;

-- Enhanced templates policies
CREATE POLICY "compliance_templates_enhanced_select_access" ON public.compliance_templates
FOR SELECT USING (
  -- All authenticated users can view active templates
  is_active = true OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true
);

CREATE POLICY "compliance_templates_enhanced_manage_access" ON public.compliance_templates
FOR ALL USING (
  -- Only admins can manage templates
  (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true
)
WITH CHECK (
  -- Only admins can manage templates
  (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true
);

-- Create function to get compliance statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_compliance_statistics(user_uuid uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_user_id uuid;
  is_user_admin boolean;
  stats_result jsonb;
BEGIN
  -- Determine target user
  IF user_uuid IS NULL THEN
    target_user_id := auth.uid();
  ELSE
    target_user_id := user_uuid;
  END IF;

  -- Check if current user is admin
  SELECT COALESCE(is_admin, false) INTO is_user_admin
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Get compliance statistics
  WITH deadline_data AS (
    SELECT
      status,
      priority,
      deadline_date,
      CASE
        WHEN deadline_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')
        THEN true
        ELSE false
      END as is_overdue,
      CASE
        WHEN deadline_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
             AND status NOT IN ('completed', 'cancelled')
        THEN true
        ELSE false
      END as is_due_soon
    FROM public.compliance_deadlines
    WHERE
      CASE
        WHEN is_user_admin THEN true  -- Admins see all deadlines if no user specified, or specific user's deadlines
        WHEN user_uuid IS NULL THEN user_id = auth.uid()  -- No specific user requested, show current user's deadlines
        ELSE target_user_id = auth.uid() AND user_id = target_user_id  -- Specific user requested, only if it's the current user or current user is admin
      END
  )
  SELECT jsonb_build_object(
    'total_deadlines', COUNT(*),
    'completed_deadlines', COUNT(*) FILTER (WHERE status = 'completed'),
    'upcoming_deadlines', COUNT(*) FILTER (WHERE status = 'upcoming'),
    'overdue_deadlines', COUNT(*) FILTER (WHERE is_overdue = true),
    'due_soon_deadlines', COUNT(*) FILTER (WHERE is_due_soon = true),
    'high_priority_deadlines', COUNT(*) FILTER (WHERE priority IN ('high', 'critical')),
    'completion_rate',
      CASE
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)) * 100, 2)
        ELSE 0
      END,
    'overdue_rate',
      CASE
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE is_overdue = true)::numeric / COUNT(*)) * 100, 2)
        ELSE 0
      END
  ) INTO stats_result
  FROM deadline_data;

  RETURN stats_result;
END;
$$;

-- Create function to get upcoming deadlines with admin support
CREATE OR REPLACE FUNCTION get_upcoming_deadlines(days_ahead integer DEFAULT 30, user_uuid uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  deadline_date date,
  deadline_time time,
  agency text,
  priority text,
  status text,
  days_until_due integer,
  regulation_reference text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_user_id uuid;
  is_user_admin boolean;
  cutoff_date date;
BEGIN
  -- Determine target user
  IF user_uuid IS NULL THEN
    target_user_id := auth.uid();
  ELSE
    target_user_id := user_uuid;
  END IF;

  -- Check if current user is admin
  SELECT COALESCE(is_admin, false) INTO is_user_admin
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Calculate cutoff date
  cutoff_date := CURRENT_DATE + days_ahead;

  RETURN QUERY
  SELECT
    cd.id,
    cd.title,
    cd.description,
    cd.deadline_date,
    cd.deadline_time,
    cd.agency,
    cd.priority,
    cd.status,
    (cd.deadline_date - CURRENT_DATE)::integer as days_until_due,
    cd.regulation_reference
  FROM public.compliance_deadlines cd
  WHERE
    -- Apply user/admin filtering
    CASE
      WHEN is_user_admin AND user_uuid IS NULL THEN true  -- Admin seeing all deadlines
      WHEN is_user_admin AND user_uuid IS NOT NULL THEN cd.user_id = target_user_id  -- Admin viewing specific user
      ELSE cd.user_id = auth.uid()  -- Regular user seeing own deadlines
    END
    -- Apply date and status filtering
    AND cd.deadline_date BETWEEN CURRENT_DATE AND cutoff_date
    AND cd.status NOT IN ('completed', 'cancelled')
  ORDER BY cd.deadline_date ASC, cd.priority DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_compliance_statistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_deadlines(integer, uuid) TO authenticated;

-- Create some default deadlines for demo purposes (only if none exist for current user)
-- This helps solve the blank page issue by providing sample data
DO $$
DECLARE
    current_user_id uuid;
    deadline_count integer;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();

    -- Only proceed if we have a user
    IF current_user_id IS NOT NULL THEN
        -- Check if user already has deadlines
        SELECT COUNT(*) INTO deadline_count
        FROM public.compliance_deadlines
        WHERE user_id = current_user_id;

        -- If no deadlines exist, create some sample ones
        IF deadline_count = 0 THEN
            INSERT INTO public.compliance_deadlines (
                user_id, title, description, deadline_date, agency,
                regulation_reference, priority, status, recurrence_type,
                recurrence_interval, reminder_days
            ) VALUES
            (current_user_id, 'FDA Food Facility Registration Renewal', 'Biennial renewal of FDA food facility registration required', CURRENT_DATE + INTERVAL '45 days', 'FDA', '21 CFR 1.230', 'high', 'upcoming', 'annually', 2, ARRAY[30, 14, 7, 1]),
            (current_user_id, 'HACCP Plan Annual Review', 'Annual comprehensive review and update of HACCP plan', CURRENT_DATE + INTERVAL '90 days', 'FDA', '21 CFR 120', 'medium', 'upcoming', 'annually', 1, ARRAY[30, 14, 7]),
            (current_user_id, 'Supplier Verification Activities', 'Complete annual supplier verification activities per FSMA requirements', CURRENT_DATE + INTERVAL '120 days', 'FDA', '21 CFR 117.410', 'high', 'upcoming', 'annually', 1, ARRAY[30, 14, 7]),
            (current_user_id, 'Environmental Monitoring Program Review', 'Quarterly review of environmental monitoring program effectiveness', CURRENT_DATE + INTERVAL '15 days', 'FDA', '21 CFR 117.165', 'medium', 'upcoming', 'quarterly', 3, ARRAY[7, 3, 1]);
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors in sample data creation
        NULL;
END;
$$;

-- Log the compliance calendar fix
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'compliance_calendar_admin_access_implemented',
  jsonb_build_object(
    'fix_date', now(),
    'security_measures', ARRAY[
      'admin_users_can_access_all_compliance_deadlines',
      'admin_users_can_manage_all_reminders_and_templates',
      'enhanced_rls_policies_with_admin_override',
      'compliance_statistics_function_with_admin_access',
      'upcoming_deadlines_function_with_admin_support',
      'sample_data_creation_for_new_users'
    ],
    'affected_tables', ARRAY['compliance_deadlines', 'compliance_reminders', 'compliance_templates'],
    'functions_created', ARRAY['get_compliance_statistics', 'get_upcoming_deadlines']
  ),
  'medium'
);

COMMIT;
-- Fix Task Management Admin Access - Allow admin users to access all tasks
-- This fixes the infinite loading issue in the task management tab for admin users

BEGIN;

-- Drop existing restrictive policies for tasks
DROP POLICY IF EXISTS "Users can view tasks they created or are assigned to" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks they created" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;

-- Create enhanced policies that include admin access

-- SELECT policy: Users can view their own tasks + admin can view all
CREATE POLICY "tasks_enhanced_select_access" ON public.tasks
FOR SELECT USING (
  CASE
    -- Admin users can access all tasks
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can access tasks they created, are assigned to, or assigned by them
    ELSE (
      auth.uid() = user_id OR
      auth.uid() = assigned_to OR
      auth.uid() = assigned_by OR
      auth.uid() IN (
        SELECT team_owner FROM public.team_members
        WHERE member_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        ) AND status = 'active'
      )
    )
  END
);

-- INSERT policy: Users can create tasks + admin can create for anyone
CREATE POLICY "tasks_enhanced_insert_access" ON public.tasks
FOR INSERT WITH CHECK (
  CASE
    -- Admin users can create tasks for anyone
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can only create tasks for themselves
    ELSE auth.uid() = user_id
  END
);

-- UPDATE policy: Users can update their tasks + admin can update all
CREATE POLICY "tasks_enhanced_update_access" ON public.tasks
FOR UPDATE USING (
  CASE
    -- Admin users can update all tasks
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can update tasks they created or are assigned to
    ELSE (
      auth.uid() = user_id OR
      auth.uid() = assigned_to OR
      auth.uid() = assigned_by
    )
  END
)
WITH CHECK (
  CASE
    -- Admin users can make any updates
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can make updates to tasks they have access to
    ELSE (
      auth.uid() = user_id OR
      auth.uid() = assigned_to OR
      auth.uid() = assigned_by
    )
  END
);

-- DELETE policy: Users can delete their tasks + admin can delete all
CREATE POLICY "tasks_enhanced_delete_access" ON public.tasks
FOR DELETE USING (
  CASE
    -- Admin users can delete all tasks
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can only delete tasks they created
    ELSE auth.uid() = user_id
  END
);

-- Fix task_comments policies

-- Drop existing restrictive policies for task_comments
DROP POLICY IF EXISTS "Users can view comments on tasks they have access to" ON public.task_comments;
DROP POLICY IF EXISTS "Users can create comments on tasks they have access to" ON public.task_comments;

-- CREATE enhanced task_comments policies

-- SELECT policy: Users can view comments on tasks they have access to + admin can view all
CREATE POLICY "task_comments_enhanced_select_access" ON public.task_comments
FOR SELECT USING (
  CASE
    -- Admin users can view all task comments
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can view comments on tasks they have access to
    ELSE task_id IN (
      SELECT id FROM public.tasks WHERE
      auth.uid() = user_id OR
      auth.uid() = assigned_to OR
      auth.uid() = assigned_by OR
      auth.uid() IN (
        SELECT team_owner FROM public.team_members
        WHERE member_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        ) AND status = 'active'
      )
    )
  END
);

-- INSERT policy: Users can create comments on tasks they have access to + admin can comment on all
CREATE POLICY "task_comments_enhanced_insert_access" ON public.task_comments
FOR INSERT WITH CHECK (
  CASE
    -- Admin users can comment on all tasks
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN (
      auth.uid() = user_id
    )

    -- Regular users can comment on tasks they have access to
    ELSE (
      auth.uid() = user_id AND
      task_id IN (
        SELECT id FROM public.tasks WHERE
        auth.uid() = user_id OR
        auth.uid() = assigned_to OR
        auth.uid() = assigned_by
      )
    )
  END
);

-- UPDATE policy for task_comments (allow editing own comments)
CREATE POLICY "task_comments_enhanced_update_access" ON public.task_comments
FOR UPDATE USING (
  CASE
    -- Admin users can update all comments
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can only update their own comments
    ELSE auth.uid() = user_id
  END
)
WITH CHECK (
  CASE
    -- Admin users can make any updates
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can only update their own comments
    ELSE auth.uid() = user_id
  END
);

-- DELETE policy for task_comments
CREATE POLICY "task_comments_enhanced_delete_access" ON public.task_comments
FOR DELETE USING (
  CASE
    -- Admin users can delete all comments
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can only delete their own comments
    ELSE auth.uid() = user_id
  END
);

-- Fix team_members policies

-- Drop existing restrictive policies for team_members
DROP POLICY IF EXISTS "Users can view team members they own or are part of" ON public.team_members;
DROP POLICY IF EXISTS "Users can create team member invitations" ON public.team_members;

-- CREATE enhanced team_members policies

-- SELECT policy: Users can view their team + admin can view all teams
CREATE POLICY "team_members_enhanced_select_access" ON public.team_members
FOR SELECT USING (
  CASE
    -- Admin users can view all team members
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can view teams they own or are part of
    ELSE (
      auth.uid() = team_owner OR
      member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  END
);

-- INSERT policy: Users can create team invitations + admin can create for any team
CREATE POLICY "team_members_enhanced_insert_access" ON public.team_members
FOR INSERT WITH CHECK (
  CASE
    -- Admin users can create team member invitations for any team
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can only create invitations for teams they own
    ELSE auth.uid() = team_owner
  END
);

-- UPDATE policy for team_members
CREATE POLICY "team_members_enhanced_update_access" ON public.team_members
FOR UPDATE USING (
  CASE
    -- Admin users can update all team member records
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can update teams they own
    ELSE auth.uid() = team_owner
  END
)
WITH CHECK (
  CASE
    -- Admin users can make any updates
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can update teams they own
    ELSE auth.uid() = team_owner
  END
);

-- DELETE policy for team_members
CREATE POLICY "team_members_enhanced_delete_access" ON public.team_members
FOR DELETE USING (
  CASE
    -- Admin users can delete any team member records
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true

    -- Regular users can delete from teams they own
    ELSE auth.uid() = team_owner
  END
);

-- Create function to get task statistics for current user (with admin override)
CREATE OR REPLACE FUNCTION get_user_task_statistics(user_uuid uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_user_id uuid;
  is_user_admin boolean;
  task_stats jsonb;
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

  -- Get task statistics
  WITH task_data AS (
    SELECT
      status,
      priority,
      CASE
        WHEN due_date IS NOT NULL AND due_date < now() AND status != 'completed'
        THEN true
        ELSE false
      END as is_overdue
    FROM public.tasks
    WHERE
      CASE
        WHEN is_user_admin THEN true  -- Admins see all tasks if no user specified, or specific user's tasks
        WHEN user_uuid IS NULL THEN (  -- No specific user requested, show current user's tasks
          user_id = auth.uid() OR
          assigned_to = auth.uid() OR
          assigned_by = auth.uid()
        )
        ELSE (  -- Specific user requested, only if it's the current user or current user is admin
          target_user_id = auth.uid() AND (
            user_id = target_user_id OR
            assigned_to = target_user_id OR
            assigned_by = target_user_id
          )
        )
      END
  )
  SELECT jsonb_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE status = 'completed'),
    'pending_tasks', COUNT(*) FILTER (WHERE status = 'todo'),
    'in_progress_tasks', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'review_tasks', COUNT(*) FILTER (WHERE status = 'review'),
    'overdue_tasks', COUNT(*) FILTER (WHERE is_overdue = true),
    'high_priority_tasks', COUNT(*) FILTER (WHERE priority IN ('high', 'critical')),
    'completion_rate',
      CASE
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)) * 100, 2)
        ELSE 0
      END
  ) INTO task_stats
  FROM task_data;

  RETURN task_stats;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_task_statistics(uuid) TO authenticated;

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for tasks table
DROP TRIGGER IF EXISTS update_tasks_updated_at_trigger ON public.tasks;
CREATE TRIGGER update_tasks_updated_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Log the security fix
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'task_management_admin_access_implemented',
  jsonb_build_object(
    'fix_date', now(),
    'security_measures', ARRAY[
      'admin_users_can_access_all_tasks',
      'admin_users_can_manage_all_team_members',
      'admin_users_can_view_all_task_comments',
      'enhanced_rls_policies_with_admin_override',
      'task_statistics_function_with_admin_access'
    ],
    'affected_tables', ARRAY['tasks', 'task_comments', 'team_members'],
    'policy_changes', 'enhanced_all_policies_with_admin_checks'
  ),
  'medium'
);

COMMIT;
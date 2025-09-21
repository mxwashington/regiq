-- Phase 2: Enhanced Team Collaboration System
-- Build comprehensive team management with workflows and permissions

-- Create teams table for organizational structure
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  team_type text DEFAULT 'department', -- department, project, facility_group, etc.
  settings jsonb DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced team members table with detailed permissions
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- admin, manager, member, viewer
  permissions jsonb DEFAULT '{}', -- granular permissions
  status text DEFAULT 'active', -- active, inactive, pending
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Team alert assignments for collaborative workflows
CREATE TABLE IF NOT EXISTS public.team_alert_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id), -- specific team member
  status text DEFAULT 'assigned', -- assigned, in_progress, completed, escalated
  priority text DEFAULT 'medium', -- low, medium, high, critical
  due_date TIMESTAMPTZ,
  notes text,
  workflow_stage text DEFAULT 'initial_review',
  metadata jsonb DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team activity feed for collaboration tracking
CREATE TABLE IF NOT EXISTS public.team_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type text NOT NULL, -- alert_assigned, task_completed, comment_added, etc.
  entity_type text NOT NULL, -- alert, task, facility, team_member
  entity_id text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collaborative comments system
CREATE TABLE IF NOT EXISTS public.collaboration_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL, -- alert, task, facility, team
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  mentions UUID[] DEFAULT '{}', -- mentioned user IDs
  attachments jsonb DEFAULT '{}',
  reply_to UUID REFERENCES public.collaboration_comments(id),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team notifications and mentions
CREATE TABLE IF NOT EXISTS public.team_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  sender_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES public.teams(id),
  notification_type text NOT NULL, -- mention, assignment, escalation, etc.
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  action_url text,
  metadata jsonb DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_alert_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they belong to" 
ON public.teams 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = teams.id 
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
);

CREATE POLICY "Team admins can manage teams" 
ON public.teams 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = teams.id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('admin', 'manager')
    AND tm.status = 'active'
  )
);

-- RLS Policies for team_members
CREATE POLICY "Users can view team memberships for their teams" 
ON public.team_members 
FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

CREATE POLICY "Team admins can manage team members" 
ON public.team_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('admin', 'manager')
    AND tm.status = 'active'
  )
);

-- RLS Policies for team_alert_assignments
CREATE POLICY "Team members can view assignments for their teams" 
ON public.team_alert_assignments 
FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

CREATE POLICY "Team members can manage assignments" 
ON public.team_alert_assignments 
FOR ALL 
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    AND tm.role IN ('admin', 'manager', 'member')
  )
);

-- RLS Policies for team_activities
CREATE POLICY "Team members can view activities for their teams" 
ON public.team_activities 
FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

CREATE POLICY "Team members can create activities" 
ON public.team_activities 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

-- RLS Policies for collaboration_comments
CREATE POLICY "Users can view comments on entities they have access to" 
ON public.collaboration_comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL); -- Will be refined based on entity access

CREATE POLICY "Users can create comments" 
ON public.collaboration_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.collaboration_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for team_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.team_notifications 
FOR SELECT 
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications" 
ON public.team_notifications 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Functions for team collaboration
CREATE OR REPLACE FUNCTION public.create_team_with_admin(
  team_name text,
  team_description text DEFAULT NULL,
  team_type text DEFAULT 'department'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_team_id uuid;
BEGIN
  -- Create the team
  INSERT INTO public.teams (name, description, team_type, created_by)
  VALUES (team_name, team_description, team_type, auth.uid())
  RETURNING id INTO new_team_id;
  
  -- Make creator an admin
  INSERT INTO public.team_members (team_id, user_id, role, status, joined_at)
  VALUES (new_team_id, auth.uid(), 'admin', 'active', now());
  
  RETURN new_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_alert_to_team(
  alert_id_param UUID,
  team_id_param UUID,
  assigned_to_param UUID DEFAULT NULL,
  priority_param text DEFAULT 'medium',
  notes_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  assignment_id uuid;
  team_name_var text;
BEGIN
  -- Verify user has permission to assign alerts for this team
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_id_param 
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'manager', 'member')
    AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: No permission to assign alerts for this team';
  END IF;
  
  -- Create assignment
  INSERT INTO public.team_alert_assignments (
    alert_id, team_id, assigned_by, assigned_to, priority, notes
  )
  VALUES (
    alert_id_param, team_id_param, auth.uid(), assigned_to_param, priority_param, notes_param
  )
  RETURNING id INTO assignment_id;
  
  -- Log activity
  SELECT name INTO team_name_var FROM public.teams WHERE id = team_id_param;
  
  INSERT INTO public.team_activities (
    team_id, user_id, activity_type, entity_type, entity_id, description, metadata
  )
  VALUES (
    team_id_param,
    auth.uid(),
    'alert_assigned',
    'alert',
    alert_id_param::text,
    format('Alert assigned to team %s', team_name_var),
    jsonb_build_object(
      'assignment_id', assignment_id,
      'priority', priority_param,
      'assigned_to', assigned_to_param
    )
  );
  
  RETURN assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_team_comment(
  entity_type_param text,
  entity_id_param UUID,
  content_param text,
  mentions_param UUID[] DEFAULT '{}',
  reply_to_param UUID DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  comment_id uuid;
  mention_user_id uuid;
BEGIN
  -- Create comment
  INSERT INTO public.collaboration_comments (
    entity_type, entity_id, user_id, content, mentions, reply_to
  )
  VALUES (
    entity_type_param, entity_id_param, auth.uid(), content_param, mentions_param, reply_to_param
  )
  RETURNING id INTO comment_id;
  
  -- Create notifications for mentioned users
  FOREACH mention_user_id IN ARRAY mentions_param
  LOOP
    INSERT INTO public.team_notifications (
      recipient_id, sender_id, notification_type, title, message, 
      entity_type, entity_id, metadata
    )
    VALUES (
      mention_user_id,
      auth.uid(),
      'mention',
      'You were mentioned in a comment',
      substring(content_param FROM 1 FOR 100) || CASE WHEN length(content_param) > 100 THEN '...' ELSE '' END,
      entity_type_param,
      entity_id_param,
      jsonb_build_object('comment_id', comment_id)
    );
  END LOOP;
  
  RETURN comment_id;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_team_alert_assignments_updated_at
  BEFORE UPDATE ON public.team_alert_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_collaboration_comments_updated_at
  BEFORE UPDATE ON public.collaboration_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
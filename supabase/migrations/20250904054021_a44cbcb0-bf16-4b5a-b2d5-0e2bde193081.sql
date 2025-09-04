-- Create tasks table for compliance task management
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'cancelled')) DEFAULT 'todo',
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  due_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  alert_id TEXT, -- Link to regulatory alert if task was created from alert
  category TEXT, -- compliance_review, implementation, training, audit_prep, etc.
  tags TEXT[], -- for flexible categorization
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_comments table for collaboration
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_members table for task assignment
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  member_name TEXT,
  role TEXT CHECK (role IN ('admin', 'member', 'viewer')) DEFAULT 'member',
  status TEXT CHECK (status IN ('pending', 'active', 'inactive')) DEFAULT 'pending',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks they created or are assigned to" 
ON public.tasks 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to OR 
  auth.uid() = assigned_by OR
  auth.uid() IN (
    SELECT team_owner FROM public.team_members WHERE member_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ) AND status = 'active'
  )
);

CREATE POLICY "Users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tasks they created or are assigned to" 
ON public.tasks 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to OR 
  auth.uid() = assigned_by
);

CREATE POLICY "Users can delete tasks they created" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on tasks they have access to" 
ON public.task_comments 
FOR SELECT 
USING (
  task_id IN (
    SELECT id FROM public.tasks WHERE 
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR 
    auth.uid() = assigned_by
  )
);

CREATE POLICY "Users can create comments on tasks they have access to" 
ON public.task_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  task_id IN (
    SELECT id FROM public.tasks WHERE 
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR 
    auth.uid() = assigned_by
  )
);

-- RLS Policies for team_members
CREATE POLICY "Team owners can manage their team members" 
ON public.team_members 
FOR ALL 
USING (auth.uid() = team_owner);

CREATE POLICY "Team members can view their team" 
ON public.team_members 
FOR SELECT 
USING (
  auth.uid() = team_owner OR 
  member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_alert_id ON public.tasks(alert_id);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_team_members_team_owner ON public.team_members(team_owner);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
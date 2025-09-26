import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  assigned_to?: string | null;
  assigned_by?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
  alert_id?: string | null;
  category?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_owner: string;
  member_email: string;
  member_name?: string | null;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'inactive';
  invited_at: string;
  joined_at?: string | null;
}

// Database response types (what we get from Supabase)
interface TaskFromDB {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  assigned_to?: string | null;
  assigned_by?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
  alert_id?: string | null;
  category?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

interface TeamMemberFromDB {
  id: string;
  team_owner: string;
  member_email: string;
  member_name?: string | null;
  role: string;
  status: string;
  invited_at: string;
  joined_at?: string | null;
}

export const useTaskManagement = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Convert database task to typed task
  const convertDbTask = (dbTask: TaskFromDB): Task => ({
    ...dbTask,
    priority: dbTask.priority as Task['priority'],
    status: dbTask.status as Task['status']
  });

  // Convert database team member to typed team member
  const convertDbTeamMember = (dbMember: TeamMemberFromDB): TeamMember => ({
    ...dbMember,
    role: dbMember.role as TeamMember['role'],
    status: dbMember.status as TeamMember['status']
  });

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typedTasks = (data || []).map(convertDbTask);
      setTasks(typedTasks);
    } catch (error) {
      logger.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive"
      });
    }
  };

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('invited_at', { ascending: false });

      if (error) throw error;
      const typedMembers = (data || []).map(convertDbTeamMember);
      setTeamMembers(typedMembers);
    } catch (error) {
      logger.error('Error fetching team members:', error);
    }
  };

  // Create task
  const createTask = async (taskData: Partial<Task> & { title: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description || null,
          priority: taskData.priority || 'medium',
          status: taskData.status || 'todo',
          category: taskData.category || null,
          due_date: taskData.due_date || null,
          alert_id: taskData.alert_id || null,
          tags: taskData.tags || null,
          user_id: user.id,
          assigned_by: user.id,
          assigned_to: taskData.assigned_to || null
        }])
        .select()
        .single();

      if (error) throw error;

      const typedTask = convertDbTask(data);
      setTasks(prev => [typedTask, ...prev]);
      toast({
        title: "Success",
        description: "Task created successfully"
      });

      return typedTask;
    } catch (error) {
      logger.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updateData: any = { ...updates };
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      const typedTask = convertDbTask(data);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? typedTask : task
      ));

      toast({
        title: "Success",
        description: "Task updated successfully"
      });

      return typedTask;
    } catch (error) {
      logger.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
    } catch (error) {
      logger.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Create task from alert
  const createTaskFromAlert = async (alertId: string, alertTitle: string, alertSummary: string) => {
    return createTask({
      title: `Review: ${alertTitle}`,
      description: `Regulatory alert requires review and action.\n\nAlert Summary: ${alertSummary}`,
      alert_id: alertId,
      category: 'compliance_review',
      priority: 'medium',
      tags: ['regulatory', 'alert']
    });
  };

  // Add task comment
  const addTaskComment = async (taskId: string, comment: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: taskId,
          user_id: user.id,
          comment
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment added successfully"
      });

      return data;
    } catch (error) {
      logger.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Get task comments
  const getTaskComments = async (taskId: string): Promise<TaskComment[]> => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching comments:', error);
      return [];
    }
  };

  // Invite team member
  const inviteTeamMember = async (email: string, name?: string, role: 'admin' | 'member' | 'viewer' = 'member') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          team_owner: user.id,
          member_email: email,
          member_name: name || null,
          role,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      const typedMember = convertDbTeamMember(data);
      setTeamMembers(prev => [typedMember, ...prev]);
      toast({
        title: "Success",
        description: `Team member invited: ${email}`
      });

      return typedMember;
    } catch (error) {
      logger.error('Error inviting team member:', error);
      toast({
        title: "Error",
        description: "Failed to invite team member",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Get task statistics
  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const pendingTasks = tasks.filter(task => task.status === 'todo').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
    const overdueTasks = tasks.filter(task => 
      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
    ).length;

    return {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      overdue: overdueTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchTeamMembers()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    tasks,
    teamMembers,
    loading,
    createTask,
    updateTask,
    deleteTask,
    createTaskFromAlert,
    addTaskComment,
    getTaskComments,
    inviteTeamMember,
    getTaskStats,
    fetchTasks
  };
};
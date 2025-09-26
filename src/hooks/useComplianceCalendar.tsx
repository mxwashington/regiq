import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export interface ComplianceDeadline {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  deadline_date: string; // DATE format
  deadline_time?: string | null; // TIME format
  agency: string;
  regulation_reference?: string | null;
  facility_id?: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed' | 'cancelled';
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  recurrence_interval: number;
  next_occurrence?: string | null;
  tags?: string[] | null;
  reminder_days: number[];
  completion_date?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceTemplate {
  id: string;
  title: string;
  description?: string | null;
  agency: string;
  regulation_reference?: string | null;
  category?: string | null;
  default_priority: string;
  recurrence_type: string;
  typical_deadline_months?: number[] | null;
  is_active: boolean;
  created_at: string;
}

interface DeadlineFromDB {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  deadline_date: string;
  deadline_time?: string | null;
  agency: string;
  regulation_reference?: string | null;
  facility_id?: string | null;
  priority: string;
  status: string;
  recurrence_type: string;
  recurrence_interval: number;
  next_occurrence?: string | null;
  tags?: string[] | null;
  reminder_days: number[];
  completion_date?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const useComplianceCalendar = () => {
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);
  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Convert database deadline to typed deadline
  const convertDbDeadline = (dbDeadline: DeadlineFromDB): ComplianceDeadline => ({
    ...dbDeadline,
    priority: dbDeadline.priority as ComplianceDeadline['priority'],
    status: dbDeadline.status as ComplianceDeadline['status'],
    recurrence_type: dbDeadline.recurrence_type as ComplianceDeadline['recurrence_type']
  });

  // Fetch deadlines
  const fetchDeadlines = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_deadlines')
        .select('*')
        .order('deadline_date', { ascending: true });

      if (error) throw error;
      const typedDeadlines = (data || []).map(convertDbDeadline);
      setDeadlines(typedDeadlines);
    } catch (error) {
      logger.error('Error fetching deadlines:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance deadlines",
        variant: "destructive"
      });
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_templates')
        .select('*')
        .eq('is_active', true)
        .order('agency', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logger.error('Error fetching templates:', error);
    }
  };

  // Create deadline
  const createDeadline = async (deadlineData: Partial<ComplianceDeadline> & { title: string; deadline_date: string; agency: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('compliance_deadlines')
        .insert([{
          title: deadlineData.title,
          description: deadlineData.description || null,
          deadline_date: deadlineData.deadline_date,
          deadline_time: deadlineData.deadline_time || null,
          agency: deadlineData.agency,
          regulation_reference: deadlineData.regulation_reference || null,
          facility_id: deadlineData.facility_id || null,
          priority: deadlineData.priority || 'medium',
          status: deadlineData.status || 'upcoming',
          recurrence_type: deadlineData.recurrence_type || 'none',
          recurrence_interval: deadlineData.recurrence_interval || 1,
          next_occurrence: deadlineData.next_occurrence || null,
          tags: deadlineData.tags || null,
          reminder_days: deadlineData.reminder_days || [7, 3, 1],
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const typedDeadline = convertDbDeadline(data);
      setDeadlines(prev => [typedDeadline, ...prev].sort((a, b) => 
        new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
      ));

      toast({
        title: "Success",
        description: "Compliance deadline created successfully"
      });

      return typedDeadline;
    } catch (error) {
      logger.error('Error creating deadline:', error);
      toast({
        title: "Error",
        description: "Failed to create deadline",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update deadline
  const updateDeadline = async (deadlineId: string, updates: Partial<ComplianceDeadline>) => {
    try {
      const updateData: any = { ...updates };
      
      const { data, error } = await supabase
        .from('compliance_deadlines')
        .update(updateData)
        .eq('id', deadlineId)
        .select()
        .single();

      if (error) throw error;

      const typedDeadline = convertDbDeadline(data);
      setDeadlines(prev => prev.map(deadline => 
        deadline.id === deadlineId ? typedDeadline : deadline
      ).sort((a, b) => 
        new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
      ));

      toast({
        title: "Success",
        description: "Deadline updated successfully"
      });

      return typedDeadline;
    } catch (error) {
      logger.error('Error updating deadline:', error);
      toast({
        title: "Error",
        description: "Failed to update deadline",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Mark deadline as completed
  const completeDeadline = async (deadlineId: string, notes?: string) => {
    return updateDeadline(deadlineId, {
      status: 'completed',
      completion_date: new Date().toISOString(),
      completion_notes: notes || null
    });
  };

  // Delete deadline
  const deleteDeadline = async (deadlineId: string) => {
    try {
      const { error } = await supabase
        .from('compliance_deadlines')
        .delete()
        .eq('id', deadlineId);

      if (error) throw error;

      setDeadlines(prev => prev.filter(deadline => deadline.id !== deadlineId));
      toast({
        title: "Success",
        description: "Deadline deleted successfully"
      });
    } catch (error) {
      logger.error('Error deleting deadline:', error);
      toast({
        title: "Error",
        description: "Failed to delete deadline",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Create deadline from template
  const createFromTemplate = async (template: ComplianceTemplate, deadlineDate: string) => {
    return createDeadline({
      title: template.title,
      description: template.description,
      deadline_date: deadlineDate,
      agency: template.agency,
      regulation_reference: template.regulation_reference,
      priority: template.default_priority as ComplianceDeadline['priority'],
      recurrence_type: template.recurrence_type as ComplianceDeadline['recurrence_type'],
      tags: template.category ? [template.category] : undefined
    });
  };

  // Get upcoming deadlines (next 30 days)
  const getUpcomingDeadlines = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return deadlines.filter(deadline => 
      deadline.status !== 'completed' && 
      deadline.status !== 'cancelled' &&
      new Date(deadline.deadline_date) <= thirtyDaysFromNow
    );
  };

  // Get overdue deadlines
  const getOverdueDeadlines = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return deadlines.filter(deadline => 
      deadline.status !== 'completed' && 
      deadline.status !== 'cancelled' &&
      new Date(deadline.deadline_date) < today
    );
  };

  // Get deadlines due soon (next 7 days)
  const getDueSoonDeadlines = () => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    return deadlines.filter(deadline => 
      deadline.status !== 'completed' && 
      deadline.status !== 'cancelled' &&
      new Date(deadline.deadline_date) >= today &&
      new Date(deadline.deadline_date) <= sevenDaysFromNow
    );
  };

  // Get deadline statistics
  const getDeadlineStats = () => {
    const total = deadlines.length;
    const completed = deadlines.filter(d => d.status === 'completed').length;
    const upcoming = getUpcomingDeadlines().length;
    const overdue = getOverdueDeadlines().length;
    const dueSoon = getDueSoonDeadlines().length;

    return {
      total,
      completed,
      upcoming,
      overdue,
      dueSoon,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDeadlines(), fetchTemplates()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    deadlines,
    templates,
    loading,
    createDeadline,
    updateDeadline,
    completeDeadline,
    deleteDeadline,
    createFromTemplate,
    getUpcomingDeadlines,
    getOverdueDeadlines,
    getDueSoonDeadlines,
    getDeadlineStats,
    fetchDeadlines
  };
};
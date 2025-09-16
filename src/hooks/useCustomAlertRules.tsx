import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AlertRule {
  id: string;
  user_id: string;
  term: string;
  frequency: 'realtime' | 'daily' | 'weekly';
  is_active: boolean;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  trigger_count: number;
}

export interface AlertRuleMatch {
  id: string;
  alert_rule_id: string;
  alert_id: string;
  matched_at: string;
  notified_at: string | null;
  notification_status: 'pending' | 'sent' | 'failed';
}

export const useCustomAlertRules = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch user's alert rules
  const fetchAlertRules = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlertRules((data as any[])?.map(item => ({
        ...item,
        frequency: item.frequency as 'realtime' | 'daily' | 'weekly'
      })) || []);
    } catch (error: any) {
      console.error('Error fetching alert rules:', error);
      toast({
        title: "Error",
        description: "Failed to load alert rules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Create new alert rule
  const createAlertRule = useCallback(async (
    term: string,
    frequency: 'realtime' | 'daily' | 'weekly' = 'realtime',
    emailEnabled: boolean = true
  ): Promise<boolean> => {
    if (!user) return false;

    const trimmedTerm = term.trim();
    if (!trimmedTerm) {
      toast({
        title: "Error",
        description: "Alert term cannot be empty",
        variant: "destructive"
      });
      return false;
    }

    // Check for duplicate terms
    const existingRule = alertRules.find(rule => 
      rule.term.toLowerCase() === trimmedTerm.toLowerCase() && rule.is_active
    );

    if (existingRule) {
      toast({
        title: "Error", 
        description: "You already have an active alert for this term",
        variant: "destructive"
      });
      return false;
    }

    try {
      setCreating(true);
      const { error } = await supabase
        .from('alert_rules')
        .insert({
          user_id: user.id,
          term: trimmedTerm,
          frequency,
          email_enabled: emailEnabled,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Alert Created",
        description: `You'll now receive ${frequency} alerts for "${trimmedTerm}"`,
        variant: "default"
      });

      await fetchAlertRules();
      return true;
    } catch (error: any) {
      console.error('Error creating alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to create alert rule",
        variant: "destructive"
      });
      return false;
    } finally {
      setCreating(false);
    }
  }, [user, alertRules, toast, fetchAlertRules]);

  // Update alert rule
  const updateAlertRule = useCallback(async (
    ruleId: string,
    updates: Partial<Pick<AlertRule, 'term' | 'frequency' | 'is_active' | 'email_enabled'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Alert Updated",
        description: "Your alert rule has been updated",
        variant: "default"
      });

      await fetchAlertRules();
      return true;
    } catch (error: any) {
      console.error('Error updating alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to update alert rule",
        variant: "destructive"
      });
      return false;
    }
  }, [toast, fetchAlertRules]);

  // Delete alert rule
  const deleteAlertRule = useCallback(async (ruleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Alert Deleted",
        description: "Your alert rule has been removed",
        variant: "default"
      });

      setAlertRules(prev => prev.filter(rule => rule.id !== ruleId));
      return true;
    } catch (error: any) {
      console.error('Error deleting alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete alert rule",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Get recent matches for a rule
  const getRecentMatches = useCallback(async (ruleId: string): Promise<AlertRuleMatch[]> => {
    try {
      const { data, error } = await supabase
        .from('alert_rule_matches')
        .select('*')
        .eq('alert_rule_id', ruleId)
        .order('matched_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return ((data as any[])?.map(item => ({
        ...item,
        notification_status: item.notification_status as 'pending' | 'sent' | 'failed'
      })) || []) as AlertRuleMatch[];
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }, []);

  // Trigger manual processing (for testing)
  const triggerManualProcessing = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('process-alert-terms');
      
      if (error) throw error;

      toast({
        title: "Processing Complete",
        description: `Processed ${data?.processed || 0} alert rules`,
        variant: "default"
      });

      return true;
    } catch (error: any) {
      console.error('Error triggering processing:', error);
      toast({
        title: "Error",
        description: "Failed to trigger alert processing",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchAlertRules();
  }, [fetchAlertRules]);

  return {
    alertRules,
    loading,
    creating,
    fetchAlertRules,
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    getRecentMatches,
    triggerManualProcessing
  };
};
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export interface WorkflowStep {
  name: string;
  type: 'manual' | 'automated' | 'approval';
  description: string;
  estimatedHours?: number;
  approvalLevel?: string;
  assignTo?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflowDefinition: {
    steps: WorkflowStep[];
    conditions?: Array<{ if: string; then: string; }>;
  };
  isActive: boolean;
  isSystemTemplate: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  name: string;
  currentStep: number;
  totalSteps: number;
  status: 'active' | 'completed' | 'cancelled' | 'error';
  priority: 'low' | 'medium' | 'high' | 'critical';
  contextData: Record<string, any>;
  stepHistory: Array<{
    stepNumber: number;
    stepName: string;
    completedAt: string;
    completedBy: string;
    input: Record<string, any>;
  }>;
  assignedUsers: string[];
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  workflowTemplates?: {
    name: string;
    category: string;
    description: string;
  };
  steps?: WorkflowStepExecution[];
}

export interface WorkflowStepExecution {
  id: string;
  workflowInstanceId: string;
  stepNumber: number;
  stepName: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  executionNotes?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export const useAdvancedWorkflows = () => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const { toast } = useToast();

  const fetchWorkflowTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-workflows', {
        body: { action: 'get_templates' }
      });

      if (error) throw error;

      if (data.success) {
        setTemplates(data.data || []);
        return data.data || [];
      } else {
        throw new Error(data.error || 'Failed to fetch templates');
      }
    } catch (error: any) {
      logger.error('Error fetching workflow templates:', error);
      toast({
        title: "Failed to Load Templates",
        description: error.message || "Could not fetch workflow templates",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createWorkflowTemplate = useCallback(async (templateData: {
    name: string;
    description: string;
    category: string;
    steps: WorkflowStep[];
    conditions?: Array<{ if: string; then: string; }>;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-workflows', {
        body: {
          action: 'create_template',
          templateData
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Template Created",
          description: `Workflow template "${templateData.name}" has been created successfully.`,
        });

        // Refresh templates list
        await fetchWorkflowTemplates();
        
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create template');
      }
    } catch (error: any) {
      logger.error('Error creating workflow template:', error);
      toast({
        title: "Template Creation Failed",
        description: error.message || "Failed to create workflow template",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchWorkflowTemplates]);

  const createWorkflowInstance = useCallback(async (
    templateId: string,
    workflowName: string,
    contextData: Record<string, any> = {}
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-workflows', {
        body: {
          action: 'create_instance',
          templateId,
          workflowName,
          contextData
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Workflow Started",
          description: `Workflow "${workflowName}" has been started successfully.`,
        });

        // Refresh instances list
        await fetchWorkflowInstances();
        
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create workflow instance');
      }
    } catch (error: any) {
      logger.error('Error creating workflow instance:', error);
      toast({
        title: "Workflow Creation Failed",
        description: error.message || "Failed to start workflow",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const advanceWorkflowStep = useCallback(async (
    instanceId: string,
    stepInput: Record<string, any> = {}
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-workflows', {
        body: {
          action: 'advance_step',
          instanceId,
          stepInput
        }
      });

      if (error) throw error;

      if (data.success) {
        const result = data.data;
        
        toast({
          title: result.status === 'completed' ? "Workflow Completed" : "Step Advanced",
          description: result.message,
        });

        // Refresh instances list
        await fetchWorkflowInstances();
        
        return result;
      } else {
        throw new Error(data.error || 'Failed to advance workflow step');
      }
    } catch (error: any) {
      logger.error('Error advancing workflow step:', error);
      toast({
        title: "Step Advancement Failed",
        description: error.message || "Failed to advance workflow step",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchWorkflowInstances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('advanced-workflows', {
        body: { action: 'get_instances' }
      });

      if (error) throw error;

      if (data.success) {
        setInstances(data.data || []);
        return data.data || [];
      } else {
        throw new Error(data.error || 'Failed to fetch instances');
      }
    } catch (error: any) {
      logger.error('Error fetching workflow instances:', error);
      toast({
        title: "Failed to Load Workflows",
        description: error.message || "Could not fetch workflow instances",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'active': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }, []);

  const getStepStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-gray-600';
      case 'failed': return 'text-red-600';
      case 'skipped': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }, []);

  return {
    loading,
    templates,
    instances,
    fetchWorkflowTemplates,
    createWorkflowTemplate,
    createWorkflowInstance,
    advanceWorkflowStep,
    fetchWorkflowInstances,
    getStatusColor,
    getPriorityColor,
    getStepStatusColor
  };
};
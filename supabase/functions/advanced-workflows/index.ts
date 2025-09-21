import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkflowRequest {
  action: 'create_instance' | 'advance_step' | 'get_templates' | 'create_template' | 'get_instances'
  templateId?: string
  instanceId?: string
  workflowName?: string
  contextData?: Record<string, any>
  stepInput?: Record<string, any>
  templateData?: {
    name: string
    description: string
    category: string
    steps: WorkflowStep[]
    conditions?: WorkflowCondition[]
  }
}

interface WorkflowStep {
  name: string
  type: 'manual' | 'automated' | 'approval'
  description: string
  estimatedHours?: number
  approvalLevel?: string
  assignTo?: string
}

interface WorkflowCondition {
  if: string
  then: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: WorkflowRequest = await req.json();
    const { action } = requestData;

    console.log('Processing workflow request:', { action, ...requestData });

    const userId = await getUserIdFromRequest(req, supabase);
    if (!userId && action !== 'get_templates') {
      throw new Error('Authentication required');
    }

    let result;

    switch (action) {
      case 'get_templates':
        result = await getWorkflowTemplates(supabase, userId);
        break;
      
      case 'create_template':
        if (!requestData.templateData) {
          throw new Error('Template data required');
        }
        result = await createWorkflowTemplate(supabase, userId!, requestData.templateData);
        break;
      
      case 'create_instance':
        if (!requestData.templateId || !requestData.workflowName) {
          throw new Error('Template ID and workflow name required');
        }
        result = await createWorkflowInstance(
          supabase, 
          userId!, 
          requestData.templateId, 
          requestData.workflowName,
          requestData.contextData || {}
        );
        break;
      
      case 'advance_step':
        if (!requestData.instanceId) {
          throw new Error('Instance ID required');
        }
        result = await advanceWorkflowStep(
          supabase, 
          userId!, 
          requestData.instanceId,
          requestData.stepInput || {}
        );
        break;
      
      case 'get_instances':
        result = await getWorkflowInstances(supabase, userId!);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in advanced workflows:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function getWorkflowTemplates(supabase: any, userId: string | null) {
  const query = supabase
    .from('workflow_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (userId) {
    // Get both system templates and user templates
    query.or(`is_system_template.eq.true,user_id.eq.${userId}`);
  } else {
    // Only system templates for unauthenticated requests
    query.eq('is_system_template', true);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

async function createWorkflowTemplate(supabase: any, userId: string, templateData: any) {
  const { data, error } = await supabase
    .from('workflow_templates')
    .insert({
      user_id: userId,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      workflow_definition: {
        steps: templateData.steps,
        conditions: templateData.conditions || []
      },
      is_active: true,
      is_system_template: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createWorkflowInstance(
  supabase: any, 
  userId: string, 
  templateId: string, 
  workflowName: string,
  contextData: Record<string, any>
) {
  // Get the template
  const { data: template, error: templateError } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;
  if (!template) throw new Error('Template not found');

  const workflowDefinition = template.workflow_definition;
  const steps = workflowDefinition.steps || [];
  
  // Create workflow instance
  const { data: instance, error: instanceError } = await supabase
    .from('workflow_instances')
    .insert({
      template_id: templateId,
      user_id: userId,
      name: workflowName,
      current_step: 1,
      total_steps: steps.length,
      status: 'active',
      context_data: contextData,
      step_history: [],
      assigned_users: [userId]
    })
    .select()
    .single();

  if (instanceError) throw instanceError;

  // Create step executions for all steps
  const stepExecutions = steps.map((step: WorkflowStep, index: number) => ({
    workflow_instance_id: instance.id,
    step_number: index + 1,
    step_name: step.name,
    status: index === 0 ? 'pending' : 'pending',
    input_data: {},
    assigned_to: step.assignTo ? step.assignTo : userId
  }));

  const { error: stepsError } = await supabase
    .from('workflow_step_executions')
    .insert(stepExecutions);

  if (stepsError) throw stepsError;

  // Update template usage count
  await supabase
    .from('workflow_templates')
    .update({ usage_count: template.usage_count + 1 })
    .eq('id', templateId);

  return instance;
}

async function advanceWorkflowStep(
  supabase: any, 
  userId: string, 
  instanceId: string,
  stepInput: Record<string, any>
) {
  // Get current workflow instance
  const { data: instance, error: instanceError } = await supabase
    .from('workflow_instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (instanceError) throw instanceError;
  if (!instance) throw new Error('Workflow instance not found');

  if (instance.status !== 'active') {
    throw new Error('Workflow is not active');
  }

  // Get current step execution
  const { data: currentStep, error: stepError } = await supabase
    .from('workflow_step_executions')
    .select('*')
    .eq('workflow_instance_id', instanceId)
    .eq('step_number', instance.current_step)
    .single();

  if (stepError) throw stepError;
  if (!currentStep) throw new Error('Current step not found');

  // Check if user can execute this step
  if (currentStep.assigned_to !== userId && instance.user_id !== userId) {
    throw new Error('Not authorized to execute this step');
  }

  // Complete current step
  const { error: completeStepError } = await supabase
    .from('workflow_step_executions')
    .update({
      status: 'completed',
      output_data: stepInput,
      completed_at: new Date().toISOString()
    })
    .eq('id', currentStep.id);

  if (completeStepError) throw completeStepError;

  // Update step history
  const updatedStepHistory = [...(instance.step_history || []), {
    stepNumber: instance.current_step,
    stepName: currentStep.step_name,
    completedAt: new Date().toISOString(),
    completedBy: userId,
    input: stepInput
  }];

  // Check if workflow is complete
  const isComplete = instance.current_step >= instance.total_steps;
  
  if (isComplete) {
    // Complete the workflow
    const { error: completeWorkflowError } = await supabase
      .from('workflow_instances')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        step_history: updatedStepHistory
      })
      .eq('id', instanceId);

    if (completeWorkflowError) throw completeWorkflowError;

    return { 
      status: 'completed', 
      message: 'Workflow completed successfully',
      completedAt: new Date().toISOString()
    };
  } else {
    // Advance to next step
    const nextStepNumber = instance.current_step + 1;
    
    // Mark next step as in progress
    const { error: nextStepError } = await supabase
      .from('workflow_step_executions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('workflow_instance_id', instanceId)
      .eq('step_number', nextStepNumber);

    if (nextStepError) throw nextStepError;

    // Update workflow instance
    const { error: updateInstanceError } = await supabase
      .from('workflow_instances')
      .update({
        current_step: nextStepNumber,
        step_history: updatedStepHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId);

    if (updateInstanceError) throw updateInstanceError;

    return { 
      status: 'advanced', 
      currentStep: nextStepNumber,
      totalSteps: instance.total_steps,
      message: `Advanced to step ${nextStepNumber} of ${instance.total_steps}`
    };
  }
}

async function getWorkflowInstances(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('workflow_instances')
    .select(`
      *,
      workflow_templates (
        name,
        category,
        description
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get step executions for each instance
  for (const instance of data) {
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_step_executions')
      .select('*')
      .eq('workflow_instance_id', instance.id)
      .order('step_number');

    if (!stepsError) {
      instance.steps = steps;
    }
  }

  return data;
}

async function getUserIdFromRequest(req: Request, supabase: any): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || null;
  } catch {
    return null;
  }
}
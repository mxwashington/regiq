import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Workflow, 
  Play, 
  Plus, 
  CheckCircle, 
  Clock, 
  Users, 
  ArrowRight, 
  Settings, 
  BarChart3,
  PlayCircle,
  AlertCircle
} from 'lucide-react';
import { useAdvancedWorkflows, WorkflowTemplate, WorkflowInstance, WorkflowStep } from '@/hooks/useAdvancedWorkflows';
import { useToast } from '@/hooks/use-toast';

export const AdvancedWorkflowsDashboard: React.FC = () => {
  const {
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
  } = useAdvancedWorkflows();

  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [isCreateInstanceDialogOpen, setIsCreateInstanceDialogOpen] = useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [stepInput, setStepInput] = useState('');

  // Template creation state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'compliance',
    steps: [
      { name: '', type: 'manual' as const, description: '', estimatedHours: 1 }
    ]
  });

  useEffect(() => {
    fetchWorkflowTemplates();
    fetchWorkflowInstances();
  }, [fetchWorkflowTemplates, fetchWorkflowInstances]);

  const handleCreateInstance = async () => {
    if (!selectedTemplate || !workflowName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a template and enter a workflow name.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createWorkflowInstance(selectedTemplate.id, workflowName.trim(), {});
      setIsCreateInstanceDialogOpen(false);
      setWorkflowName('');
      setSelectedTemplate(null);
    } catch (error) {
      // Error already handled in the hook
    }
  };

  const handleAdvanceStep = async (instanceId: string) => {
    try {
      await advanceWorkflowStep(instanceId, { notes: stepInput });
      setSelectedInstance(null);
      setStepInput('');
    } catch (error) {
      // Error already handled in the hook
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || newTemplate.steps.some(s => !s.name.trim())) {
      toast({
        title: "Invalid Template",
        description: "Please provide a template name and ensure all steps have names.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createWorkflowTemplate(newTemplate);
      setIsCreateTemplateDialogOpen(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'compliance',
        steps: [{ name: '', type: 'manual', description: '', estimatedHours: 1 }]
      });
    } catch (error) {
      // Error already handled in the hook
    }
  };

  const addStep = () => {
    setNewTemplate(prev => ({
      ...prev,
      steps: [...prev.steps, { name: '', type: 'manual', description: '', estimatedHours: 1 }]
    }));
  };

  const removeStep = (index: number) => {
    if (newTemplate.steps.length > 1) {
      setNewTemplate(prev => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index)
      }));
    }
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    setNewTemplate(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const activeInstances = instances.filter(i => i.status === 'active');
  const completedInstances = instances.filter(i => i.status === 'completed');
  const averageProgress = instances.length > 0 
    ? instances.reduce((sum, i) => sum + (i.currentStep / i.totalSteps) * 100, 0) / instances.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Workflow className="h-8 w-8 text-primary" />
            Advanced Workflows
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated compliance workflows with custom approval processes
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateTemplateDialogOpen} onOpenChange={setIsCreateTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Workflow Template</DialogTitle>
                <DialogDescription>
                  Design a reusable workflow template for your compliance processes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Supplier Onboarding"
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateCategory">Category</Label>
                    <Select 
                      value={newTemplate.category} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="supplier_management">Supplier Management</SelectItem>
                        <SelectItem value="incident_response">Incident Response</SelectItem>
                        <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this workflow accomplishes..."
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Workflow Steps</Label>
                    <Button type="button" onClick={addStep} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step
                    </Button>
                  </div>
                  {newTemplate.steps.map((step, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Step {index + 1}</span>
                        {newTemplate.steps.length > 1 && (
                          <Button 
                            type="button" 
                            onClick={() => removeStep(index)} 
                            size="sm" 
                            variant="ghost"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Step name"
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                        />
                        <Select 
                          value={step.type} 
                          onValueChange={(value: 'manual' | 'automated' | 'approval') => updateStep(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="automated">Automated</SelectItem>
                            <SelectItem value="approval">Approval</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        placeholder="Step description"
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handleCreateTemplate} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateInstanceDialogOpen} onOpenChange={setIsCreateInstanceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Start Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Workflow</DialogTitle>
                <DialogDescription>
                  Create a new workflow instance from a template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">Select Template</Label>
                  <Select onValueChange={(value) => {
                    const template = templates.find(t => t.id === value);
                    setSelectedTemplate(template || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a workflow template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="workflowName">Workflow Name</Label>
                  <Input
                    id="workflowName"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="e.g., Acme Corp Supplier Review"
                  />
                </div>
                {selectedTemplate && (
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Template: {selectedTemplate.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{selectedTemplate.description}</p>
                    <div className="text-sm">
                      <strong>Steps:</strong> {selectedTemplate.workflowDefinition.steps.length}
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handleCreateInstance} 
                  disabled={loading || !selectedTemplate}
                  className="w-full"
                >
                  {loading ? 'Starting...' : 'Start Workflow'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeInstances.length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedInstances.length}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">Available templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Across all workflows</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="instances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="instances">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="space-y-4">
          {activeInstances.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No active workflows.</p>
                <p className="text-sm text-muted-foreground">Start a new workflow to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeInstances.map((instance) => (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <span>{instance.name}</span>
                        <Badge variant="outline" className={getStatusColor(instance.status)}>
                          {instance.status}
                        </Badge>
                        <Badge variant="secondary" className={getPriorityColor(instance.priority)}>
                          {instance.priority}
                        </Badge>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        Step {instance.currentStep} of {instance.totalSteps}
                      </div>
                    </div>
                    <CardDescription>
                      {instance.workflowTemplates?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span>{Math.round((instance.currentStep / instance.totalSteps) * 100)}%</span>
                        </div>
                        <Progress value={(instance.currentStep / instance.totalSteps) * 100} />
                      </div>

                      {instance.steps && (
                        <div>
                          <h4 className="font-medium mb-2">Steps:</h4>
                          <div className="space-y-2">
                            {instance.steps.slice(0, 3).map((step) => (
                              <div key={step.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    step.status === 'completed' ? 'bg-green-500' :
                                    step.status === 'in_progress' ? 'bg-blue-500' :
                                    'bg-gray-300'
                                  }`} />
                                  <span>{step.stepName}</span>
                                </div>
                                <Badge variant="outline" className={getStepStatusColor(step.status)}>
                                  {step.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(instance.createdAt).toLocaleDateString()}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSelectedInstance(instance)}
                          className="flex items-center gap-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Advance Step
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{template.name}</span>
                    {template.isSystemTemplate && (
                      <Badge variant="secondary">System</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="capitalize">{template.category.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Steps:</span>
                      <span>{template.workflowDefinition.steps.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span>{template.usageCount} times</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedInstances.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No completed workflows yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedInstances.map((instance) => (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        {instance.name}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        Completed {instance.completedAt ? new Date(instance.completedAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {instance.totalSteps} steps completed • 
                      Duration: {instance.completedAt && instance.createdAt ? 
                        Math.ceil((new Date(instance.completedAt).getTime() - new Date(instance.createdAt).getTime()) / (1000 * 60 * 60 * 24)) 
                        : 'Unknown'} days
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Step Advancement Dialog */}
      {selectedInstance && (
        <Dialog open={!!selectedInstance} onOpenChange={() => setSelectedInstance(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Advance Workflow Step</DialogTitle>
              <DialogDescription>
                Complete current step: Step {selectedInstance.currentStep} of {selectedInstance.totalSteps}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="stepNotes">Step Notes (optional)</Label>
                <Textarea
                  id="stepNotes"
                  value={stepInput}
                  onChange={(e) => setStepInput(e.target.value)}
                  placeholder="Add any notes about this step completion..."
                />
              </div>
              <Button 
                onClick={() => handleAdvanceStep(selectedInstance.id)} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Complete Step'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
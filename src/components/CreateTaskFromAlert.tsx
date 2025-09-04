import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskManagement, Task } from '@/hooks/useTaskManagement';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { CheckSquare, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateTaskFromAlertProps {
  alertId: string;
  alertTitle: string;
  alertSummary: string;
  alertSource?: string;
  className?: string;
}

export const CreateTaskFromAlert: React.FC<CreateTaskFromAlertProps> = ({
  alertId,
  alertTitle,
  alertSummary,
  alertSource,
  className
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: `Review: ${alertTitle}`,
    description: `Regulatory alert requires review and action.\n\nAlert: ${alertTitle}\n\nSummary: ${alertSummary}`,
    priority: 'medium' as Task['priority'],
    category: 'compliance_review',
    due_date: ''
  });

  const { createTaskFromAlert } = useTaskManagement();
  const { checkFeatureAccess } = usePlanRestrictions();
  const { toast } = useToast();
  
  const hasTaskAccess = checkFeatureAccess('task_management');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await createTaskFromAlert(alertId, formData.title, formData.description);
      
      setOpen(false);
      toast({
        title: "Task Created",
        description: "Compliance task created successfully from regulatory alert"
      });
      
      // Reset form
      setFormData({
        title: `Review: ${alertTitle}`,
        description: `Regulatory alert requires review and action.\n\nAlert: ${alertTitle}\n\nSummary: ${alertSummary}`,
        priority: 'medium',
        category: 'compliance_review',
        due_date: ''
      });
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setLoading(false);
    }
  };

  if (!hasTaskAccess) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <CheckSquare className="h-4 w-4 mr-1" />
        Create Task
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <CheckSquare className="h-4 w-4 mr-1" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Task from Alert</DialogTitle>
          <DialogDescription>
            Create a compliance task to track actions needed for this regulatory alert.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task and any requirements..."
              className="min-h-[120px]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Task['priority'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance_review">Compliance Review</SelectItem>
                  <SelectItem value="implementation">Implementation</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="audit_prep">Audit Preparation</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="due_date">Due Date (Optional)</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
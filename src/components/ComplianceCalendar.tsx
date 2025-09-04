import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useComplianceCalendar, ComplianceDeadline, ComplianceTemplate } from '@/hooks/useComplianceCalendar';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { Plus, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle, Filter, Building } from 'lucide-react';
import { format, formatDistance, isAfter, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const DeadlineCard: React.FC<{ 
  deadline: ComplianceDeadline; 
  onUpdate: (deadlineId: string, updates: Partial<ComplianceDeadline>) => void;
  onComplete: (deadlineId: string, notes?: string) => void;
}> = ({ deadline, onUpdate, onComplete }) => {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'due_soon': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusFromDate = (deadlineDate: string, currentStatus: string) => {
    if (currentStatus === 'completed' || currentStatus === 'cancelled') return currentStatus;
    
    const today = new Date();
    const deadline = new Date(deadlineDate);
    const sevenDaysFromNow = addDays(today, 7);
    
    if (isBefore(deadline, today)) return 'overdue';
    if (isBefore(deadline, sevenDaysFromNow)) return 'due_soon';
    return 'upcoming';
  };

  const actualStatus = getStatusFromDate(deadline.deadline_date, deadline.status);
  const isOverdue = actualStatus === 'overdue';
  const isDueSoon = actualStatus === 'due_soon';

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'completed') {
      setShowCompleteDialog(true);
    } else {
      onUpdate(deadline.id, { status: newStatus as ComplianceDeadline['status'] });
    }
  };

  const handleComplete = () => {
    onComplete(deadline.id, completionNotes);
    setShowCompleteDialog(false);
    setCompletionNotes('');
  };

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${isOverdue ? 'border-red-200 bg-red-50/30' : isDueSoon ? 'border-orange-200 bg-orange-50/30' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2 flex items-center gap-2">
                {deadline.title}
                {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {isDueSoon && <Clock className="h-4 w-4 text-orange-500" />}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className={getPriorityColor(deadline.priority)}>
                  {deadline.priority.toUpperCase()}
                </Badge>
                <Badge className={getStatusColor(actualStatus)}>
                  {actualStatus.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline">{deadline.agency}</Badge>
                {deadline.regulation_reference && (
                  <Badge variant="outline">{deadline.regulation_reference}</Badge>
                )}
              </div>
            </div>
          </div>
          
          {deadline.description && (
            <CardDescription className="text-sm">
              {deadline.description.length > 150 ? `${deadline.description.substring(0, 150)}...` : deadline.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span className={isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-orange-600 font-medium' : ''}>
                  {format(new Date(deadline.deadline_date), 'MMM d, yyyy')}
                  {deadline.deadline_time && ` at ${deadline.deadline_time}`}
                </span>
              </div>
              <div className="text-xs">
                {formatDistance(new Date(deadline.deadline_date), new Date(), { addSuffix: true })}
              </div>
            </div>
          </div>

          {deadline.recurrence_type !== 'none' && (
            <div className="text-xs text-muted-foreground mb-3">
              Recurring: {deadline.recurrence_type}
              {deadline.next_occurrence && ` (Next: ${format(new Date(deadline.next_occurrence), 'MMM d, yyyy')})`}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Select value={deadline.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              {deadline.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleteDialog(true)}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </Button>
              )}
            </div>
          </div>

          {deadline.completion_date && (
            <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-800">
              <div className="font-medium">Completed on {format(new Date(deadline.completion_date), 'MMM d, yyyy')}</div>
              {deadline.completion_notes && <div className="text-xs mt-1">{deadline.completion_notes}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Deadline</DialogTitle>
            <DialogDescription>
              Mark this compliance deadline as completed and add any notes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="completion-notes">Completion Notes (Optional)</Label>
              <Textarea
                id="completion-notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about completion, actions taken, etc..."
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete}>
                Mark Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const CreateDeadlineDialog: React.FC<{ 
  templates: ComplianceTemplate[];
  onDeadlineCreate: () => void;
}> = ({ templates, onDeadlineCreate }) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ComplianceTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline_date: '',
    deadline_time: '',
    agency: '',
    regulation_reference: '',
    priority: 'medium' as ComplianceDeadline['priority'],
    recurrence_type: 'none' as ComplianceDeadline['recurrence_type'],
    tags: ''
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const { createDeadline, createFromTemplate } = useComplianceCalendar();

  const handleTemplateSelect = (template: ComplianceTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      title: template.title,
      description: template.description || '',
      deadline_date: '',
      deadline_time: '',
      agency: template.agency,
      regulation_reference: template.regulation_reference || '',
      priority: template.default_priority as ComplianceDeadline['priority'],
      recurrence_type: template.recurrence_type as ComplianceDeadline['recurrence_type'],
      tags: template.category ? template.category : ''
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({ ...prev, deadline_date: format(date, 'yyyy-MM-dd') }));
      setShowCalendar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedTemplate && formData.deadline_date) {
        await createFromTemplate(selectedTemplate, formData.deadline_date);
      } else {
        await createDeadline({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined
        });
      }
      
      resetForm();
      setOpen(false);
      onDeadlineCreate();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deadline_date: '',
      deadline_time: '',
      agency: '',
      regulation_reference: '',
      priority: 'medium',
      recurrence_type: 'none',
      tags: ''
    });
    setSelectedTemplate(null);
    setSelectedDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Deadline
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Compliance Deadline</DialogTitle>
          <DialogDescription>
            Add a new compliance deadline or create one from a template.
          </DialogDescription>
        </DialogHeader>
        
        {templates.length > 0 && (
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Quick Start from Template</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {templates.slice(0, 8).map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start h-auto p-2"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div>
                    <div className="font-medium text-xs">{template.title}</div>
                    <div className="text-xs text-muted-foreground">{template.agency}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter deadline title..."
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the compliance requirement..."
              className="min-h-[60px]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Deadline Date</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="deadline_time">Time (Optional)</Label>
              <Input
                id="deadline_time"
                type="time"
                value={formData.deadline_time}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline_time: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="agency">Agency</Label>
              <Select value={formData.agency} onValueChange={(value) => setFormData(prev => ({ ...prev, agency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FDA">FDA</SelectItem>
                  <SelectItem value="USDA">USDA</SelectItem>
                  <SelectItem value="EPA">EPA</SelectItem>
                  <SelectItem value="OSHA">OSHA</SelectItem>
                  <SelectItem value="CDC">CDC</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as ComplianceDeadline['priority'] }))}>
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
          </div>
          
          <div>
            <Label htmlFor="regulation_reference">Regulation Reference (Optional)</Label>
            <Input
              id="regulation_reference"
              value={formData.regulation_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, regulation_reference: e.target.value }))}
              placeholder="e.g., 21 CFR 117.410"
            />
          </div>
          
          <div>
            <Label htmlFor="recurrence_type">Recurrence</Label>
            <Select value={formData.recurrence_type} onValueChange={(value) => setFormData(prev => ({ ...prev, recurrence_type: value as ComplianceDeadline['recurrence_type'] }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Deadline</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeadlineStats: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-blue-600" />
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Deadlines</div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-600" />
          <div>
            <div className="text-2xl font-bold">{stats.dueSoon}</div>
            <div className="text-sm text-muted-foreground">Due Soon</div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div>
            <div className="text-2xl font-bold">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-purple-600" />
          <div>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const ComplianceCalendar: React.FC = () => {
  const { 
    deadlines, 
    templates, 
    loading, 
    updateDeadline, 
    completeDeadline, 
    getDeadlineStats, 
    fetchDeadlines 
  } = useComplianceCalendar();
  const { checkFeatureAccess } = usePlanRestrictions();
  const [filter, setFilter] = useState('all');
  
  const hasCalendarAccess = checkFeatureAccess('compliance_calendar');
  const stats = getDeadlineStats();

  const filteredDeadlines = deadlines.filter(deadline => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return deadline.status === 'upcoming';
    if (filter === 'due_soon') return deadline.status === 'due_soon' || 
      (deadline.status === 'upcoming' && new Date(deadline.deadline_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    if (filter === 'overdue') return deadline.status === 'overdue' || 
      (deadline.status === 'upcoming' && new Date(deadline.deadline_date) < new Date());
    if (filter === 'completed') return deadline.status === 'completed';
    return true;
  });

  if (!hasCalendarAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Compliance Calendar</h3>
              <p className="text-muted-foreground mb-4">
                Track regulatory deadlines, recurring obligations, and compliance milestones with automated reminders.
              </p>
              <Badge variant="outline" className="mb-4">Starter Plan Required</Badge>
            </div>
            <Button>Upgrade to Access Compliance Calendar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading compliance calendar...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Calendar</h1>
          <p className="text-muted-foreground">
            Track regulatory deadlines and compliance obligations
          </p>
        </div>
        <CreateDeadlineDialog templates={templates} onDeadlineCreate={fetchDeadlines} />
      </div>

      <DeadlineStats stats={stats} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deadlines</SelectItem>
              <SelectItem value="due_soon">Due Soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredDeadlines.length} of {deadlines.length} deadlines
        </div>
      </div>

      <div className="grid gap-4">
        {filteredDeadlines.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deadlines found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? "Create your first compliance deadline to get started" 
                  : `No ${filter.replace('_', ' ')} deadlines found`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDeadlines.map((deadline) => (
            <DeadlineCard 
              key={deadline.id} 
              deadline={deadline} 
              onUpdate={updateDeadline}
              onComplete={completeDeadline}
            />
          ))
        )}
      </div>
    </div>
  );
};
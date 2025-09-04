import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTaskManagement, Task } from '@/hooks/useTaskManagement';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { Plus, Calendar, User, MessageSquare, Filter, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const TaskCard: React.FC<{ task: Task; onUpdate: (taskId: string, updates: Partial<Task>) => void }> = ({ task, onUpdate }) => {
  const [showComments, setShowComments] = useState(false);
  const { getTaskComments, addTaskComment } = useTaskManagement();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

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
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'review': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleStatusChange = (newStatus: string) => {
    const updates: Partial<Task> = { status: newStatus as Task['status'] };
    if (newStatus === 'completed') {
      updates.completion_date = new Date().toISOString();
    }
    onUpdate(task.id, updates);
  };

  const loadComments = async () => {
    const taskComments = await getTaskComments(task.id);
    setComments(taskComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addTaskComment(task.id, newComment);
    setNewComment('');
    loadComments();
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    if (!showComments) {
      loadComments();
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card className={`transition-all hover:shadow-md ${isOverdue ? 'border-red-200 bg-red-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{task.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {task.category && (
                <Badge variant="outline">{task.category.replace('_', ' ')}</Badge>
              )}
            </div>
          </div>
          {isOverdue && (
            <AlertTriangle className="h-5 w-5 text-red-500 ml-2" />
          )}
        </div>
        
        {task.description && (
          <CardDescription className="text-sm">
            {task.description.length > 150 ? `${task.description.substring(0, 150)}...` : task.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-4">
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {task.assigned_to && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Assigned</span>
              </div>
            )}
          </div>
          <span>Created {format(new Date(task.created_at), 'MMM d')}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Select value={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleComments}
              className="flex items-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              Comments
            </Button>
          </div>
        </div>

        {showComments && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-2 mb-3">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <div className="font-medium text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                  </div>
                  <div>{comment.comment}</div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px]"
              />
              <Button size="sm" onClick={handleAddComment}>
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CreateTaskDialog: React.FC<{ onTaskCreate: () => void }> = ({ onTaskCreate }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    category: '',
    due_date: ''
  });
  const { createTask } = useTaskManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createTask({
        ...formData,
        due_date: formData.due_date || undefined
      });
      
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: '',
        due_date: ''
      });
      setOpen(false);
      onTaskCreate();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a compliance task to track regulatory activities and deadlines.
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
              className="min-h-[80px]"
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
                  <SelectValue placeholder="Select category" />
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
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TaskStats: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <div>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
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

export const TaskManagement: React.FC = () => {
  const { tasks, loading, updateTask, getTaskStats, fetchTasks } = useTaskManagement();
  const { checkFeatureAccess } = usePlanRestrictions();
  const [filter, setFilter] = useState('all');
  
  const hasTaskAccess = checkFeatureAccess('task_management');
  const stats = getTaskStats();

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === 'todo';
    if (filter === 'active') return ['todo', 'in_progress', 'review'].includes(task.status);
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'overdue') return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    return true;
  });

  if (!hasTaskAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Task Management</h3>
              <p className="text-muted-foreground mb-4">
                Organize compliance activities with task management and team collaboration tools.
              </p>
              <Badge variant="outline" className="mb-4">Starter Plan Required</Badge>
            </div>
            <Button>Upgrade to Access Task Management</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">
            Organize and track compliance activities with team collaboration
          </p>
        </div>
        <CreateTaskDialog onTaskCreate={fetchTasks} />
      </div>

      <TaskStats stats={stats} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? "Create your first compliance task to get started" 
                  : `No ${filter} tasks found`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={updateTask} />
          ))
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Mail, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AlertRule {
  id: string;
  term: string;
  frequency: 'realtime' | 'daily' | 'weekly';
  email_enabled: boolean;
  is_active: boolean;
  created_at: string;
  last_triggered_at?: string;
  trigger_count: number;
}

export const EmailAlertTerms: React.FC = () => {
  const { user } = useAuth();
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTerm, setNewTerm] = useState('');
  const [newFrequency, setNewFrequency] = useState<'realtime' | 'daily' | 'weekly'>('daily');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadAlertRules = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlertRules(data as AlertRule[] || []);
    } catch (error) {
      console.error('Error loading alert rules:', error);
      toast.error('Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  };

  const createAlertRule = async () => {
    if (!user || !newTerm.trim()) return;

    try {
      const { data, error } = await supabase
        .from('alert_rules')
        .insert({
          user_id: user.id,
          term: newTerm.trim(),
          frequency: newFrequency,
          email_enabled: true,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setAlertRules(prev => [data as AlertRule, ...prev]);
      setNewTerm('');
      setIsDialogOpen(false);
      toast.success('Alert rule created successfully');
    } catch (error) {
      console.error('Error creating alert rule:', error);
      toast.error('Failed to create alert rule');
    }
  };

  const deleteAlertRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAlertRules(prev => prev.filter(rule => rule.id !== id));
      toast.success('Alert rule deleted');
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      toast.error('Failed to delete alert rule');
    }
  };

  const toggleAlertRule = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      
      setAlertRules(prev => prev.map(rule => 
        rule.id === id ? { ...rule, is_active: isActive } : rule
      ));
      toast.success(isActive ? 'Alert rule activated' : 'Alert rule deactivated');
    } catch (error) {
      console.error('Error updating alert rule:', error);
      toast.error('Failed to update alert rule');
    }
  };

  useEffect(() => {
    loadAlertRules();
  }, [user]);

  const getFrequencyBadgeVariant = (frequency: string) => {
    switch (frequency) {
      case 'realtime': return 'destructive';
      case 'daily': return 'default';
      case 'weekly': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Custom Email Alerts
              </CardTitle>
              <CardDescription>
                Get notified when specific terms appear in regulatory alerts
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Alert
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Alert Rule</DialogTitle>
                  <DialogDescription>
                    Set up email alerts for specific terms in regulatory notifications
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Search Term</label>
                    <Input
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      placeholder="e.g., strawberries, listeria, recall"
                      onKeyDown={(e) => e.key === 'Enter' && createAlertRule()}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Frequency</label>
                    <Select value={newFrequency} onValueChange={(value: any) => setNewFrequency(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                        <SelectItem value="weekly">Weekly summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAlertRule} disabled={!newTerm.trim()}>
                    Create Alert
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {alertRules.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Alert Rules</h3>
              <p className="text-muted-foreground mb-4">
                Create your first alert rule to get notified about specific terms
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Alert
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {alertRules.map((rule) => (
                <Card key={rule.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{rule.term}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getFrequencyBadgeVariant(rule.frequency)}>
                              {rule.frequency}
                            </Badge>
                            {rule.trigger_count > 0 && (
                              <span className="text-sm text-muted-foreground">
                                Triggered {rule.trigger_count} times
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={rule.is_active ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleAlertRule(rule.id, !rule.is_active)}
                        >
                          {rule.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlertRule(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Mail, MailX, Play, Clock } from 'lucide-react';
import { useCustomAlertRules } from '@/hooks/useCustomAlertRules';
import { format } from 'date-fns';

export const CustomAlertRules: React.FC = () => {
  const {
    alertRules,
    loading,
    creating,
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    triggerManualProcessing
  } = useCustomAlertRules();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newFrequency, setNewFrequency] = useState<'realtime' | 'daily' | 'weekly'>('realtime');
  const [emailEnabled, setEmailEnabled] = useState(true);

  const handleCreateRule = async () => {
    if (!newTerm.trim()) return;

    const success = await createAlertRule(newTerm, newFrequency, emailEnabled);
    if (success) {
      setIsDialogOpen(false);
      setNewTerm('');
      setNewFrequency('realtime');
      setEmailEnabled(true);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this alert rule? You will no longer receive notifications for this term.')) {
      return;
    }
    await deleteAlertRule(ruleId);
  };

  const toggleRuleStatus = async (rule: any) => {
    await updateAlertRule(rule.id, { is_active: !rule.is_active });
  };

  const toggleEmailStatus = async (rule: any) => {
    await updateAlertRule(rule.id, { email_enabled: !rule.email_enabled });
  };

  const getFrequencyBadge = (frequency: string) => {
    switch (frequency) {
      case 'realtime': return <Badge variant="default">Real-time</Badge>;
      case 'daily': return <Badge variant="secondary">Daily</Badge>;
      case 'weekly': return <Badge variant="outline">Weekly</Badge>;
      default: return <Badge variant="outline">{frequency}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Alert Rules</CardTitle>
              <CardDescription>
                Get notified when alerts mention specific terms like product names, companies, or keywords.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={triggerManualProcessing}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Test Processing
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Alert Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Alert Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="term">Search Term</Label>
                      <Input
                        id="term"
                        placeholder="e.g., strawberries, Acme Foods, E. coli"
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll search alert titles and summaries for this term
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="frequency">Notification Frequency</Label>
                      <Select value={newFrequency} onValueChange={(value: any) => setNewFrequency(value)}>
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Real-time (immediate)</SelectItem>
                          <SelectItem value="daily">Daily digest</SelectItem>
                          <SelectItem value="weekly">Weekly summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="email"
                        checked={emailEnabled}
                        onCheckedChange={setEmailEnabled}
                      />
                      <Label htmlFor="email">Send email notifications</Label>
                    </div>

                    <Separator />

                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateRule}
                        disabled={creating || !newTerm.trim()}
                      >
                        {creating ? 'Creating...' : 'Create Rule'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading alert rules...</p>
            </div>
          ) : alertRules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No custom alert rules yet.</p>
              <p className="text-sm text-muted-foreground">
                Create your first rule to get notified when alerts mention specific terms.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      "{rule.term}"
                    </TableCell>
                    <TableCell>
                      {getFrequencyBadge(rule.frequency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRuleStatus(rule)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEmailStatus(rule)}
                          className="p-1"
                        >
                          {rule.email_enabled ? (
                            <Mail className="h-4 w-4 text-green-600" />
                          ) : (
                            <MailX className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {rule.last_triggered_at ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {format(new Date(rule.last_triggered_at), 'MMM dd, HH:mm')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {rule.trigger_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {alertRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Real-time:</strong> Immediate email when new alerts match your terms</p>
            <p>• <strong>Daily:</strong> One email per day with all matches (sent at 9 AM)</p>
            <p>• <strong>Weekly:</strong> Weekly summary sent every Monday</p>
            <p>• Terms are matched against alert titles and summaries</p>
            <p>• Use the toggle switches to enable/disable rules and email notifications</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
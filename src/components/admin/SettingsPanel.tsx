// Settings Panel Component
// Admin configuration and RLS management

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Settings,
  Shield,
  Database,
  Users,
  Key,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEmergencyRLS, useAdminFetch } from '@/hooks/useAdminFetch';
import { formatTimeAgo } from '@/lib/format';

interface SystemConfig {
  sync_schedule: string;
  max_alerts_per_sync: number;
  retention_days: number;
  auto_dedupe_enabled: boolean;
  webhook_url?: string;
  notification_email?: string;
  rate_limit_per_hour: number;
  maintenance_mode: boolean;
}

interface RLSPolicy {
  id: string;
  table_name: string;
  policy_name: string;
  policy_type: 'permissive' | 'restrictive';
  command_type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  roles: string[];
  expression: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'viewer';
  last_login: string | null;
  created_at: string;
  enabled: boolean;
}

interface SettingsData {
  config: SystemConfig;
  rls_policies: RLSPolicy[];
  admin_users: AdminUser[];
  database_stats: {
    total_alerts: number;
    total_size: string;
    oldest_alert: string;
    newest_alert: string;
  };
}

export function SettingsPanel() {
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [newPolicy, setNewPolicy] = useState<Partial<RLSPolicy>>({
    table_name: 'alerts',
    policy_name: '',
    policy_type: 'permissive',
    command_type: 'SELECT',
    roles: [],
    expression: '',
    enabled: true,
  });
  const [newUser, setNewUser] = useState({ email: '', role: 'viewer' as const });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const { execute, loading } = useAdminFetch<SettingsData>();
  const { enableRLS, disableRLS, loading: rlsLoading } = useEmergencyRLS();

  const loadSettings = async () => {
    const data = await execute('/api/admin/settings');
    if (data) {
      setSettingsData(data);
      setConfig(data.config);
      setIsMaintenanceMode(data.config.maintenance_mode);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    const result = await execute('/api/admin/settings/config', {
      method: 'PUT',
      body: JSON.stringify(config),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result) {
      toast.success('Configuration saved successfully');
      await loadSettings();
    }
  };

  const toggleMaintenanceMode = async () => {
    const newMode = !isMaintenanceMode;
    const result = await execute('/api/admin/settings/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enabled: newMode }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result) {
      setIsMaintenanceMode(newMode);
      toast.success(`Maintenance mode ${newMode ? 'enabled' : 'disabled'}`);
    }
  };

  const createRLSPolicy = async () => {
    if (!newPolicy.policy_name || !newPolicy.expression) {
      toast.error('Policy name and expression are required');
      return;
    }

    const result = await execute('/api/admin/settings/rls', {
      method: 'POST',
      body: JSON.stringify(newPolicy),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result) {
      toast.success('RLS policy created successfully');
      setNewPolicy({
        table_name: 'alerts',
        policy_name: '',
        policy_type: 'permissive',
        command_type: 'SELECT',
        roles: [],
        expression: '',
        enabled: true,
      });
      await loadSettings();
    }
  };

  const toggleRLSPolicy = async (policyId: string, enabled: boolean) => {
    const result = await execute(`/api/admin/settings/rls/${policyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result) {
      toast.success(`Policy ${enabled ? 'enabled' : 'disabled'}`);
      await loadSettings();
    }
  };

  const deleteRLSPolicy = async (policyId: string) => {
    const result = await execute(`/api/admin/settings/rls/${policyId}`, {
      method: 'DELETE',
    });

    if (result) {
      toast.success('Policy deleted successfully');
      await loadSettings();
    }
  };

  const createAdminUser = async () => {
    if (!newUser.email) {
      toast.error('Email is required');
      return;
    }

    const result = await execute('/api/admin/settings/users', {
      method: 'POST',
      body: JSON.stringify(newUser),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result) {
      toast.success('Admin user created successfully');
      setNewUser({ email: '', role: 'viewer' });
      await loadSettings();
    }
  };

  const toggleAdminUser = async (userId: string, enabled: boolean) => {
    const result = await execute(`/api/admin/settings/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (result) {
      toast.success(`User ${enabled ? 'enabled' : 'disabled'}`);
      await loadSettings();
    }
  };

  const handleEmergencyRLS = async (enable: boolean) => {
    const result = enable ? await enableRLS() : await disableRLS();
    if (result) {
      toast.success(`RLS ${enable ? 'enabled' : 'disabled'} across all tables`);
      await loadSettings();
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPolicyTypeColor = (type: string) => {
    return type === 'permissive'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  if (!settingsData || !config) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Admin Settings</span>
            {isMaintenanceMode && (
              <Badge variant="destructive">Maintenance Mode</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="flex flex-col w-full h-auto md:grid md:grid-cols-4 md:h-10">
              <TabsTrigger value="general" className="w-full justify-start md:justify-center">General</TabsTrigger>
              <TabsTrigger value="security" className="w-full justify-start md:justify-center">Security</TabsTrigger>
              <TabsTrigger value="users" className="w-full justify-start md:justify-center">Users</TabsTrigger>
              <TabsTrigger value="database" className="w-full justify-start md:justify-center">Database</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sync-schedule">Sync Schedule (Cron)</Label>
                    <Input
                      id="sync-schedule"
                      value={config.sync_schedule}
                      onChange={(e) => setConfig({ ...config, sync_schedule: e.target.value })}
                      placeholder="0 */4 * * *"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max-alerts">Max Alerts per Sync</Label>
                    <Input
                      id="max-alerts"
                      type="number"
                      value={config.max_alerts_per_sync}
                      onChange={(e) => setConfig({ ...config, max_alerts_per_sync: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="retention">Data Retention (Days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={config.retention_days}
                      onChange={(e) => setConfig({ ...config, retention_days: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rate-limit">Rate Limit (per hour)</Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      value={config.rate_limit_per_hour}
                      onChange={(e) => setConfig({ ...config, rate_limit_per_hour: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      value={config.webhook_url || ''}
                      onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                      placeholder="https://example.com/webhook"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notification-email">Notification Email</Label>
                    <Input
                      id="notification-email"
                      type="email"
                      value={config.notification_email || ''}
                      onChange={(e) => setConfig({ ...config, notification_email: e.target.value })}
                      placeholder="admin@example.com"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-dedupe"
                      checked={config.auto_dedupe_enabled}
                      onCheckedChange={(checked) => setConfig({ ...config, auto_dedupe_enabled: checked })}
                    />
                    <Label htmlFor="auto-dedupe">Auto Deduplication</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="maintenance-mode"
                      checked={isMaintenanceMode}
                      onCheckedChange={toggleMaintenanceMode}
                    />
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveConfig} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>

              {isMaintenanceMode && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Maintenance mode is enabled. The public API and sync operations are disabled.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Emergency RLS Control</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable Row Level Security across all tables
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleEmergencyRLS(true)}
                      disabled={rlsLoading}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Enable RLS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmergencyRLS(false)}
                      disabled={rlsLoading}
                    >
                      Disable RLS
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">RLS Policies</h3>

                  {/* Create New Policy */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Create RLS Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Table Name</Label>
                          <Select
                            value={newPolicy.table_name}
                            onValueChange={(value) => setNewPolicy({ ...newPolicy, table_name: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alerts">alerts</SelectItem>
                              <SelectItem value="sync_logs">sync_logs</SelectItem>
                              <SelectItem value="profiles">profiles</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Policy Name</Label>
                          <Input
                            value={newPolicy.policy_name}
                            onChange={(e) => setNewPolicy({ ...newPolicy, policy_name: e.target.value })}
                            placeholder="my_policy"
                          />
                        </div>

                        <div>
                          <Label>Policy Type</Label>
                          <Select
                            value={newPolicy.policy_type}
                            onValueChange={(value: 'permissive' | 'restrictive') =>
                              setNewPolicy({ ...newPolicy, policy_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="permissive">Permissive</SelectItem>
                              <SelectItem value="restrictive">Restrictive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Command Type</Label>
                          <Select
                            value={newPolicy.command_type}
                            onValueChange={(value: any) => setNewPolicy({ ...newPolicy, command_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SELECT">SELECT</SelectItem>
                              <SelectItem value="INSERT">INSERT</SelectItem>
                              <SelectItem value="UPDATE">UPDATE</SelectItem>
                              <SelectItem value="DELETE">DELETE</SelectItem>
                              <SelectItem value="ALL">ALL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Policy Expression</Label>
                        <Textarea
                          value={newPolicy.expression}
                          onChange={(e) => setNewPolicy({ ...newPolicy, expression: e.target.value })}
                          placeholder="auth.uid() = user_id"
                          rows={3}
                        />
                      </div>

                      <Button onClick={createRLSPolicy} disabled={loading}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Policy
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Existing Policies */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Policy Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Command</TableHead>
                          <TableHead>Expression</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settingsData.rls_policies.map(policy => (
                          <TableRow key={policy.id}>
                            <TableCell>
                              <code>{policy.table_name}</code>
                            </TableCell>
                            <TableCell>{policy.policy_name}</TableCell>
                            <TableCell>
                              <Badge className={getPolicyTypeColor(policy.policy_type)}>
                                {policy.policy_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{policy.command_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs">{policy.expression}</code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {policy.enabled ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                <span className={policy.enabled ? 'text-green-600' : 'text-red-600'}>
                                  {policy.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={policy.enabled}
                                  onCheckedChange={(checked) => toggleRLSPolicy(policy.id, checked)}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRLSPolicy(policy.id)}
                                  className="h-8 w-8 p-0 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Users Management */}
            <TabsContent value="users" className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Admin Users</h3>

                {/* Create New User */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Admin User</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="admin@example.com"
                        />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={createAdminUser} disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </CardContent>
                </Card>

                {/* Existing Users */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settingsData.admin_users.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(user.role)}>
                              {user.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.last_login ? formatTimeAgo(user.last_login) : 'Never'}
                          </TableCell>
                          <TableCell>{formatTimeAgo(user.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {user.enabled ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              <span className={user.enabled ? 'text-green-600' : 'text-red-600'}>
                                {user.enabled ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={user.enabled}
                              onCheckedChange={(checked) => toggleAdminUser(user.id, checked)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Database Stats */}
            <TabsContent value="database" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {settingsData.database_stats.total_alerts.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Alerts</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-green-600">
                      {settingsData.database_stats.total_size}
                    </div>
                    <div className="text-sm text-muted-foreground">Database Size</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatTimeAgo(settingsData.database_stats.oldest_alert)}
                    </div>
                    <div className="text-sm text-muted-foreground">Oldest Alert</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatTimeAgo(settingsData.database_stats.newest_alert)}
                    </div>
                    <div className="text-sm text-muted-foreground">Newest Alert</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Database Operations</h3>

                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    Database operations can affect system performance. Use with caution during peak hours.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4" />
                      <span className="font-semibold">Vacuum Database</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Optimize database performance and reclaim space
                    </div>
                  </Button>

                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span className="font-semibold">Reindex Tables</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rebuild database indexes for optimal performance
                    </div>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
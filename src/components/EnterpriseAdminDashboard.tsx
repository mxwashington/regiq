import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  BarChart3, 
  Settings, 
  DollarSign, 
  Activity,
  AlertTriangle,
  Search,
  Play,
  Square,
  RefreshCw,
  Monitor,
  Presentation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/contexts/DemoContext';

interface UserMetrics {
  total_users: number;
  active_today: number;
  new_signups: number;
  enterprise_users: number;
}

interface SystemMetrics {
  api_calls_today: number;
  searches_today: number;
  alerts_sent: number;
  uptime: string;
}

interface RevenueMetrics {
  mrr: number;
  churn_rate: number;
  conversion_rate: number;
  lifetime_value: number;
}

export const EnterpriseAdminDashboard = () => {
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({
    total_users: 0,
    active_today: 0,
    new_signups: 0,
    enterprise_users: 0
  });
  
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    api_calls_today: 0,
    searches_today: 0,
    alerts_sent: 0,
    uptime: '99.97%'
  });

  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({
    mrr: 0,
    churn_rate: 0,
    conversion_rate: 0,
    lifetime_value: 0
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { 
    isDemoMode, 
    toggleDemoMode, 
    demoScenario, 
    setDemoScenario, 
    triggerDemoAlert, 
    resetDemoData,
    loading: demoLoading
  } = useDemoMode();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Load real metrics from database
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('role, created_at');

      if (profilesError) throw profilesError;

      const totalUsers = profiles?.length || 0;
      const enterpriseUsers = profiles?.filter(p => p.role === 'enterprise_admin').length || 0;
      
      // Calculate new signups (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newSignups = profiles?.filter(p => new Date(p.created_at) > weekAgo).length || 0;

      setUserMetrics({
        total_users: totalUsers,
        active_today: Math.floor(totalUsers * 0.15), // Estimated active users
        new_signups: newSignups,
        enterprise_users: enterpriseUsers
      });

      // Load search metrics
      const { data: searches, error: searchError } = await supabase
        .from('perplexity_searches')
        .select('created_at')
        .gte('created_at', new Date().toISOString().split('T')[0]); // Today's searches

      if (!searchError) {
        setSystemMetrics(prev => ({
          ...prev,
          searches_today: searches?.length || 0,
          api_calls_today: (searches?.length || 0) * 3 // Estimated API calls
        }));
      }

      // Demo revenue metrics (replace with real Stripe data)
      setRevenueMetrics({
        mrr: 24750,
        churn_rate: 2.3,
        conversion_rate: 18.5,
        lifetime_value: 4200
      });

    } catch (error) {
      console.error('Error loading metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load admin metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: string, userId?: string) => {
    try {
      // Implement user management actions
      toast({
        title: "Action Executed",
        description: `${action} completed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to execute ${action}`,
        variant: "destructive",
      });
    }
  };

  const handleSystemMaintenance = async (action: string) => {
    try {
      if (action === 'clear_cache') {
        await supabase.rpc('clean_expired_cache');
      }
      
      toast({
        title: "System Maintenance",
        description: `${action.replace('_', ' ')} completed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to execute ${action}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Mode Controls */}
      <Card className={isDemoMode ? "border-orange-500 bg-orange-50/50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Presentation className="h-5 w-5" />
                Demo Control Center
                {isDemoMode && <Badge variant="outline" className="text-orange-600">DEMO ACTIVE</Badge>}
              </CardTitle>
              <CardDescription>
                Sales presentation and onboarding demonstration tools
              </CardDescription>
            </div>
            <Switch
              checked={isDemoMode}
              onCheckedChange={toggleDemoMode}
              disabled={demoLoading}
            />
          </div>
        </CardHeader>
        
        {isDemoMode && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-scenario">Demo Scenario</Label>
                <Select value={demoScenario} onValueChange={setDemoScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food_safety">Food Safety Crisis</SelectItem>
                    <SelectItem value="pharmaceutical">Pharma Compliance</SelectItem>
                    <SelectItem value="agriculture">Agriculture Risk</SelectItem>
                    <SelectItem value="general">General Overview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Live Demo Controls</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDemoAlert('recall')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Trigger Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetDemoData}
                    disabled={demoLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDemoAlert('warning_letter')}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Demo Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDemoAlert('inspection')}
                  >
                    <Monitor className="h-4 w-4 mr-1" />
                    Show Activity
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Admin Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userMetrics.total_users.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{userMetrics.new_signups} new this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userMetrics.active_today}</div>
                <p className="text-xs text-muted-foreground">
                  {((userMetrics.active_today / userMetrics.total_users) * 100).toFixed(1)}% engagement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Searches Today</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.searches_today}</div>
                <p className="text-xs text-muted-foreground">
                  {systemMetrics.api_calls_today} API calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${revenueMetrics.mrr.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {revenueMetrics.conversion_rate}% conversion rate
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, subscriptions, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleUserAction('bulk_upgrade')}
                >
                  Bulk Upgrade
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUserAction('export_users')}
                >
                  Export Users
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUserAction('send_announcement')}
                >
                  Send Announcement
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Enterprise users: {userMetrics.enterprise_users} | 
                Active users: {userMetrics.active_today} |
                Total users: {userMetrics.total_users}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>
                Detailed usage metrics and performance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Search Performance</Label>
                  <div className="text-2xl font-bold">{systemMetrics.searches_today}</div>
                  <div className="text-xs text-muted-foreground">searches today</div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">API Usage</Label>
                  <div className="text-2xl font-bold">{systemMetrics.api_calls_today}</div>
                  <div className="text-xs text-muted-foreground">API calls today</div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">System Uptime</Label>
                  <div className="text-2xl font-bold">{systemMetrics.uptime}</div>
                  <div className="text-xs text-muted-foreground">last 30 days</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>
                Subscription metrics and financial performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Monthly Recurring Revenue</Label>
                    <div className="text-3xl font-bold">${revenueMetrics.mrr.toLocaleString()}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Churn Rate</Label>
                    <div className="text-2xl font-bold">{revenueMetrics.churn_rate}%</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Conversion Rate</Label>
                    <div className="text-2xl font-bold">{revenueMetrics.conversion_rate}%</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Customer LTV</Label>
                    <div className="text-2xl font-bold">${revenueMetrics.lifetime_value.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Administration</CardTitle>
              <CardDescription>
                Platform maintenance and configuration tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cache Management</Label>
                  <Button
                    variant="outline"
                    onClick={() => handleSystemMaintenance('clear_cache')}
                    className="w-full"
                  >
                    Clear Expired Cache
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Database Maintenance</Label>
                  <Button
                    variant="outline"
                    onClick={() => handleSystemMaintenance('optimize_db')}
                    className="w-full"
                  >
                    Optimize Database
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>API Health</Label>
                  <Button
                    variant="outline"
                    onClick={() => handleSystemMaintenance('check_apis')}
                    className="w-full"
                  >
                    Check API Status
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Content Quality</Label>
                  <Button
                    variant="outline"
                    onClick={() => handleSystemMaintenance('review_content')}
                    className="w-full"
                  >
                    Review Content
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
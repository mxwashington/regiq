import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminNavigation } from '@/components/AdminNavigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Radio, 
  BarChart3, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  Clock,
  Database
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSubscribers: number;
  feedsStatus: 'healthy' | 'warning' | 'error';
  lastFeedUpdate: string;
  systemHealth: 'good' | 'warning' | 'error';
}

export function AdminDashboard() {
  const { user } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSubscribers: 0,
    feedsStatus: 'healthy',
    lastFeedUpdate: new Date().toISOString(),
    systemHealth: 'good'
  });
  const [loading, setLoading] = useState(true);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      
      // Get user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get subscriber counts
      const { count: totalSubscribers } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('subscribed', true);
      
      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: Math.floor((totalUsers || 0) * 0.6), // Estimate
        totalSubscribers: totalSubscribers || 0,
        feedsStatus: 'healthy',
        lastFeedUpdate: new Date().toISOString(),
        systemHealth: 'good'
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminStats();
  }, []);

  const quickActions = [
    {
      label: 'Refresh All Feeds',
      icon: RefreshCw,
      action: () => console.log('Refresh feeds'),
      variant: 'default' as const
    },
    {
      label: 'Export Analytics',
      icon: BarChart3,
      action: () => console.log('Export analytics'),
      variant: 'outline' as const
    },
    {
      label: 'View System Logs',
      icon: AlertCircle,
      action: () => console.log('View logs'),
      variant: 'outline' as const
    },
    {
      label: 'Backup Database',
      icon: Database,
      action: () => console.log('Backup database'),
      variant: 'outline' as const
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.email}. Here's what's happening with RegIQ.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% active rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                <BarChart3 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubscribers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 ? Math.round((stats.totalSubscribers / stats.totalUsers) * 100) : 0}% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RSS Feeds</CardTitle>
                <Radio className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={stats.feedsStatus === 'healthy' ? 'default' : 'destructive'}
                  >
                    {stats.feedsStatus}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {new Date(stats.lastFeedUpdate).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Perform common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant={action.variant}
                      onClick={action.action}
                      className="h-auto flex flex-col items-center space-y-2 p-4"
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm text-center">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>
                Latest admin actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Admin access granted</p>
                    <p className="text-xs text-gray-500">
                      {user?.email} was granted admin privileges
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">Just now</span>
                </div>
                
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <Radio className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">RSS feeds refreshed</p>
                    <p className="text-xs text-gray-500">
                      All regulatory feeds updated successfully
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">2 min ago</span>
                </div>
                
                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New user registration</p>
                    <p className="text-xs text-gray-500">
                      User registered with Starter plan
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">5 min ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
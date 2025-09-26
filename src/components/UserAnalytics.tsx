import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SafeAuthContext';
import { format, formatDistanceToNow } from 'date-fns';

interface UserData {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_seen_at: string | null;
  role: string | null;
}

interface UserStats {
  totalUsers: number;
  activeLastWeek: number;
  activeLastMonth: number;
  newThisMonth: number;
}

export const UserAnalytics: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeLastWeek: 0,
    activeLastMonth: 0,
    newThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setError('Admin access required');
      setLoading(false);
      return;
    }

    fetchUserData();
  }, [isAdmin]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, created_at, last_seen_at, role')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profilesData || []);

      // Calculate stats
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalUsers = profilesData?.length || 0;
      const activeLastWeek = profilesData?.filter(user => 
        user.last_seen_at && new Date(user.last_seen_at) > oneWeekAgo
      ).length || 0;
      const activeLastMonth = profilesData?.filter(user => 
        user.last_seen_at && new Date(user.last_seen_at) > oneMonthAgo
      ).length || 0;
      const newThisMonth = profilesData?.filter(user => 
        new Date(user.created_at) > startOfMonth
      ).length || 0;

      setStats({
        totalUsers,
        activeLastWeek,
        activeLastMonth,
        newThisMonth
      });

    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(`Failed to load user data: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const getLastSeenDisplay = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const getUserStatus = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return 'inactive';
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const daysSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince <= 1) return 'active';
    if (daysSince <= 7) return 'recent';
    if (daysSince <= 30) return 'idle';
    return 'inactive';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      recent: 'secondary',
      idle: 'outline',
      inactive: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Admin access required to view user analytics.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Last Week</p>
                <p className="text-2xl font-bold">{stats.activeLastWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Last Month</p>
                <p className="text-2xl font-bold">{stats.activeLastMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                <p className="text-2xl font-bold">{stats.newThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Complete list of users with their email addresses and last login dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.full_name || 'Not provided'}</TableCell>
                      <TableCell>
                        {user.role ? (
                          <Badge variant="outline">{user.role}</Badge>
                        ) : (
                          <span className="text-muted-foreground">user</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(getUserStatus(user.last_seen_at))}
                      </TableCell>
                      <TableCell>{getLastSeenDisplay(user.last_seen_at)}</TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
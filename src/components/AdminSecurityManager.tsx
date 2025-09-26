import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Shield, UserCheck, AlertTriangle, Key } from 'lucide-react';
import { logger } from '@/lib/logger';

interface AdminUser {
  user_id: string;
  email: string;
  full_name?: string;
  role: string;
  admin_permissions: string[];
  is_admin: boolean;
}

export const AdminSecurityManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [permissionToGrant, setPermissionToGrant] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const availablePermissions = [
    'super_admin',
    'security_admin', 
    'analytics_admin',
    'search_admin',
    'user_manager',
    'payment_admin'
  ];

  const fetchAdminUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, role, admin_permissions, is_admin')
        .eq('is_admin', true);

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      logger.error('Failed to fetch admin users', error, 'AdminSecurityManager');
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive"
      });
    }
  }, [toast]);

  const grantPermission = useCallback(async () => {
    // Input validation and sanitization
    if (!selectedUser || !permissionToGrant) {
      toast({
        title: "Validation Error",
        description: "Please select both a user and permission",
        variant: "destructive"
      });
      return;
    }

    // Validate UUID format for user ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedUser)) {
      toast({
        title: "Security Error",
        description: "Invalid user ID format",
        variant: "destructive"
      });
      logger.warn('Invalid user ID format attempted in permission grant', { selectedUser }, 'AdminSecurityManager');
      return;
    }

    // Validate permission is in allowed list
    if (!availablePermissions.includes(permissionToGrant)) {
      toast({
        title: "Security Error",
        description: "Invalid permission specified",
        variant: "destructive"
      });
      logger.warn('Invalid permission attempted in grant', { permissionToGrant }, 'AdminSecurityManager');
      return;
    }

    // Verify user exists in current admin list (additional security check)
    const targetUser = adminUsers.find(u => u.user_id === selectedUser);
    if (!targetUser) {
      toast({
        title: "Security Error",
        description: "Target user not found in admin list",
        variant: "destructive"
      });
      logger.warn('Permission grant attempted for non-admin user', { selectedUser }, 'AdminSecurityManager');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('grant_admin_permission', {
        target_user_id: selectedUser,
        permission_name: permissionToGrant
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission granted successfully",
      });

      await fetchAdminUsers();
      setSelectedUser('');
      setPermissionToGrant('');
    } catch (error: any) {
      logger.error('Failed to grant permission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant permission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedUser, permissionToGrant, toast, fetchAdminUsers]);

  const revokePermission = useCallback(async (userId: string, permission: string) => {
    // Input validation and sanitization
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      toast({
        title: "Security Error",
        description: "Invalid user ID format",
        variant: "destructive"
      });
      logger.warn('Invalid user ID format attempted in permission revoke', { userId }, 'AdminSecurityManager');
      return;
    }

    // Validate permission is in allowed list
    if (!availablePermissions.includes(permission)) {
      toast({
        title: "Security Error",
        description: "Invalid permission specified",
        variant: "destructive"
      });
      logger.warn('Invalid permission attempted in revoke', { permission }, 'AdminSecurityManager');
      return;
    }

    // Verify user exists in current admin list (additional security check)
    const targetUser = adminUsers.find(u => u.user_id === userId);
    if (!targetUser) {
      toast({
        title: "Security Error",
        description: "Target user not found in admin list",
        variant: "destructive"
      });
      logger.warn('Permission revoke attempted for non-admin user', { userId }, 'AdminSecurityManager');
      return;
    }

    // Prevent revoking permissions from self (security measure)
    if (userId === user?.id) {
      toast({
        title: "Security Error",
        description: "Cannot revoke permissions from yourself",
        variant: "destructive"
      });
      logger.warn('Attempt to revoke own permissions blocked', { userId }, 'AdminSecurityManager');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('revoke_admin_permission', {
        target_user_id: userId,
        permission_name: permission
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission revoked successfully",
      });

      await fetchAdminUsers();
    } catch (error: any) {
      logger.error('Failed to revoke permission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke permission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchAdminUsers]);

  React.useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Security Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-select">Select Admin User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose admin user" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUsers.map((adminUser) => (
                      <SelectItem key={adminUser.user_id} value={adminUser.user_id}>
                        {adminUser.email} ({adminUser.full_name || 'No name'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="permission-select">Grant Permission</Label>
                <Select value={permissionToGrant} onValueChange={setPermissionToGrant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose permission" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePermissions.map((permission) => (
                      <SelectItem key={permission} value={permission}>
                        {permission.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={grantPermission} 
              disabled={loading || !selectedUser || !permissionToGrant}
              className="w-fit"
            >
              <Key className="w-4 h-4 mr-2" />
              Grant Permission
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Current Admin Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminUsers.map((adminUser) => (
              <div key={adminUser.user_id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{adminUser.email}</h3>
                    <p className="text-sm text-muted-foreground">
                      {adminUser.full_name || 'No display name'}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {adminUser.role}
                    </Badge>
                  </div>
                  {adminUser.user_id !== user?.id && (
                    <div className="text-right">
                      <p className="text-sm font-medium mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {adminUser.admin_permissions?.map((permission) => (
                          <Badge 
                            key={permission} 
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => revokePermission(adminUser.user_id, permission)}
                          >
                            {permission.replace('_', ' ')}
                            <span className="ml-1 text-xs">×</span>
                          </Badge>
                        )) || <span className="text-sm text-muted-foreground">No special permissions</span>}
                      </div>
                    </div>
                  )}
                </div>
                {adminUser.user_id === user?.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">This is your account</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
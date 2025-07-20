import React from 'react';
import { AdminNavigation } from './AdminNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings } from 'lucide-react';

export const EnterpriseAdminDashboard = () => {
  return (
    <div className="space-y-8">
      <AdminNavigation />
      
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Users className="h-6 w-6" />
          User Management & Settings
        </h2>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              User management and settings functionality will be implemented in the next phase.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
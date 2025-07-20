import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNavigation } from './AdminNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, Settings, Database, User } from 'lucide-react';
import { AlertsDashboard } from "./AlertsDashboard";
import { FDAAnalyticsDashboard } from "./FDAAnalyticsDashboard";
import { IntegrationEnhancements } from "./IntegrationEnhancements";
import { SessionHealthMonitor } from "./SessionHealthMonitor";
import AuthTestingPanel from "./AuthTestingPanel";
import { BugTestSuite } from "./BugTestSuite";
import { DemoInteractiveDashboard } from "./DemoInteractiveDashboard";
import { DataPipelineManager } from "./DataPipelineManager";
import { AdminAlertManager } from "./AdminAlertManager";

export const EnterpriseAdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Enterprise Admin Dashboard
        </h2>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/dashboard/user-view')}
          className="flex items-center space-x-2"
        >
          <User className="h-4 w-4" />
          <span>View as User</span>
        </Button>
      </div>
        
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="demo">Demo Dashboard</TabsTrigger>
            <TabsTrigger value="pipeline">Data Pipeline</TabsTrigger>
            <TabsTrigger value="session">Session Monitor</TabsTrigger>
            <TabsTrigger value="auth">Auth Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <AlertsDashboard />
          </TabsContent>
          
          <TabsContent value="manage">
            <AdminAlertManager />
          </TabsContent>
          
          <TabsContent value="analytics">
            <FDAAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="integrations">
            <IntegrationEnhancements />
          </TabsContent>
          
          <TabsContent value="demo">
            <DemoInteractiveDashboard />
          </TabsContent>
          
          <TabsContent value="pipeline">
            <DataPipelineManager />
          </TabsContent>
          
          <TabsContent value="session">
            <SessionHealthMonitor />
          </TabsContent>
          
          <TabsContent value="auth">
            <AuthTestingPanel />
          </TabsContent>
        </Tabs>
    </div>
  );
};
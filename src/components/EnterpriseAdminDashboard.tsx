import React from 'react';
import { AdminNavigation } from './AdminNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, Database } from 'lucide-react';
import { AlertsDashboard } from "./AlertsDashboard";
import { FDAAnalyticsDashboard } from "./FDAAnalyticsDashboard";
import { IntegrationEnhancements } from "./IntegrationEnhancements";
import { SessionHealthMonitor } from "./SessionHealthMonitor";
import AuthTestingPanel from "./AuthTestingPanel";
import { BugTestSuite } from "./BugTestSuite";
import { DemoInteractiveDashboard } from "./DemoInteractiveDashboard";
import { DataPipelineManager } from "./DataPipelineManager";

export const EnterpriseAdminDashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Database className="h-6 w-6" />
          Enterprise Admin Dashboard
        </h2>
        
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
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
    </div>
  );
};
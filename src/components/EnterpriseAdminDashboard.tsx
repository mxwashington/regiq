import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNavigation } from './AdminNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, Settings, Database, User, Search } from 'lucide-react';
import { AlertsDashboard } from "./AlertsDashboard";
import { FDAAnalyticsDashboard } from "./FDAAnalyticsDashboard";
import { IntegrationEnhancements } from "./IntegrationEnhancements";
import { SessionHealthMonitor } from "./SessionHealthMonitor";
import AuthTestingPanel from "./AuthTestingPanel";
import { BugTestSuite } from "./BugTestSuite";
import { DemoInteractiveDashboard } from "./DemoInteractiveDashboard";
import { DataPipelineManager } from "./DataPipelineManager";
import { AdminAlertManager } from "./AdminAlertManager";
import PerplexitySearch from "./PerplexitySearch";

export const EnterpriseAdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Database className="h-5 w-5 md:h-6 md:w-6" />
          Enterprise Admin Dashboard
        </h2>
      </div>
        
        <Tabs defaultValue="alerts" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:grid-cols-10 min-w-max">
              <TabsTrigger value="alerts" className="text-xs md:text-sm">Alerts</TabsTrigger>
              <TabsTrigger value="search" className="text-xs md:text-sm">AI Search</TabsTrigger>
              <TabsTrigger value="manage" className="text-xs md:text-sm">Manage</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs md:text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="integrations" className="text-xs md:text-sm">Integrations</TabsTrigger>
              <TabsTrigger value="demo" className="text-xs md:text-sm">Demo</TabsTrigger>
              <TabsTrigger value="pipeline" className="text-xs md:text-sm">Pipeline</TabsTrigger>
              <TabsTrigger value="api-monitor" className="text-xs md:text-sm">API Monitor</TabsTrigger>
              <TabsTrigger value="session" className="text-xs md:text-sm">Session</TabsTrigger>
              <TabsTrigger value="auth" className="text-xs md:text-sm">Auth</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="alerts" className="mt-4">
            <AlertsDashboard />
          </TabsContent>
          
          <TabsContent value="search" className="mt-4">
            <PerplexitySearch />
          </TabsContent>
          
          <TabsContent value="manage" className="mt-4">
            <AdminAlertManager />
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-4">
            <FDAAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="integrations" className="mt-4">
            <IntegrationEnhancements />
          </TabsContent>
          
          <TabsContent value="demo" className="mt-4">
            <DemoInteractiveDashboard />
          </TabsContent>
          
          <TabsContent value="pipeline" className="mt-4">
            <DataPipelineManager />
          </TabsContent>
          
          <TabsContent value="api-monitor" className="mt-4">
            <DataPipelineManager />
          </TabsContent>
          
          <TabsContent value="session" className="mt-4">
            <SessionHealthMonitor />
          </TabsContent>
          
          <TabsContent value="auth" className="mt-4">
            <AuthTestingPanel />
          </TabsContent>
        </Tabs>
    </div>
  );
};
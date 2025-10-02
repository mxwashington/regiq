import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AuthTestingPanel } from '@/components/stubs/MissingComponents';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Database, User, Search, Eye, Bot, Shield, Link, Cpu, Wrench, Activity } from 'lucide-react';
import { AdminAlertManager } from "./AdminAlertManager";
import { DataPipelineManager } from "./DataPipelineManager";
import { SessionHealthMonitor } from "./SessionHealthMonitor";
import { PWASettings } from "./PWASettings";
import { ConversationalChatbot } from "./ConversationalChatbot";
import { AlertSourceFinder } from "./AlertSourceFinder";
import { SourceLinkManager } from "./SourceLinkManager";
import { DataSourceTestingPanel } from "./admin/DataSourceTestingPanel";

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const handleViewAsUser = () => {
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Database className="h-5 w-5 md:h-6 md:w-6" />
          RegIQ Admin Dashboard
        </h2>
        <Button 
          onClick={handleViewAsUser}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          View as User
        </Button>
      </div>
        
      <Tabs defaultValue="alerts" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-8 min-w-max">
            <TabsTrigger value="alerts" className="text-xs md:text-sm flex items-center gap-1">
              <Database className="h-3 w-3" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="testing" className="text-xs md:text-sm flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="text-xs md:text-sm flex items-center gap-1">
              <Bot className="h-3 w-3" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="user-management" className="text-xs md:text-sm flex items-center gap-1">
              <Users className="h-3 w-3" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="source-links" className="text-xs md:text-sm flex items-center gap-1">
              <Link className="h-3 w-3" />
              Source Links
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="text-xs md:text-sm flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              API Pipeline
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs md:text-sm flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs md:text-sm flex items-center gap-1">
              <Shield className="h-3 w-3" />
              System
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Alerts Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminAlertManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Data Source Testing & Health
                <Badge variant="secondary">Unified Testing Hub</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataSourceTestingPanel />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai-assistant" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Assistant
                <Badge variant="secondary">AI Powered</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Interactive AI assistant for regulatory intelligence and compliance queries.
                </p>
                <ConversationalChatbot 
                  isOpen={isChatbotOpen} 
                  onToggle={() => setIsChatbotOpen(!isChatbotOpen)} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="user-management" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <AdminAlertManager />
                <AlertSourceFinder />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="source-links" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Source Links Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SourceLinkManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                API Pipeline & Data Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <DataPipelineManager />
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Management Tools
                  </h3>
                  <div className="space-y-6">
                    <AdminAlertManager />
                    <AlertSourceFinder />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Application Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PWASettings />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Health & Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Session Monitoring</h3>
                  <SessionHealthMonitor />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Authentication Testing</h3>
                  <AuthTestingPanel />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
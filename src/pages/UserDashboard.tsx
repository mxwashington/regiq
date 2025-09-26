import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, Settings, User, AlertTriangle } from 'lucide-react';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import PerplexityAlertCard from '@/components/PerplexityAlertCard';
import { ConversationalChatbot } from '@/components/ConversationalChatbot';
import { TrialGate } from '@/components/TrialGate';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('alerts');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load alerts
  const { alerts, loading, error, totalCount } = useSimpleAlerts(50);

  // Filter alerts based on search
  const filteredAlerts = alerts.filter(alert =>
    alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <TrialGate>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Regulatory Dashboard</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest regulatory alerts and compliance information.
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            {/* Search Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search alerts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Alerts List */}
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading alerts...</p>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <PerplexityAlertCard
                    key={alert.id}
                    alert={alert}
                    showEnhancedDetails={true}
                  />
                ))}
                {filteredAlerts.length === 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Bell className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No alerts found matching your search.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Search</CardTitle>
                <CardDescription>
                  Search regulatory databases and enhance results with AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button asChild className="w-full">
                    <a href="/search">
                      <Search className="mr-2 h-4 w-4" />
                      Open Advanced Search
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsChatOpen(true)}
                    className="w-full"
                  >
                    💬 Ask AI Assistant
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your account settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>User ID:</strong> {user?.id}</p>
                </div>
                <Button asChild>
                  <a href="/account">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI Chatbot */}
        <ConversationalChatbot
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      </div>
    </TrialGate>
  );
};

export default UserDashboard;
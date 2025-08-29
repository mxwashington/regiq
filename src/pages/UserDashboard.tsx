import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shield, Bell, TrendingUp, Settings, Search, Filter, ExternalLink, Globe, AlertCircle, Bot, MessageCircle, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { useSavedAlerts } from '@/hooks/useSavedAlerts';
import { formatDistanceToNow } from 'date-fns';
import { searchForAlert, isValidSourceUrl } from '@/lib/alert-search';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ConversationalChatbot } from '@/components/ConversationalChatbot';
import { EnhancedRecallDemo } from '@/components/EnhancedRecallDemo';
import PerplexityAlertCard from '@/components/PerplexityAlertCard';
import { ExportManager } from '@/components/ExportManager';
import RiskPredictorPage from './RiskPredictorPage';
import RiskDashboardPage from './RiskDashboardPage';
import { RegulatorySearch } from '@/components/RegulatorySearch';
import SupportWidget from '@/components/account/SupportWidget';

const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { alerts, loading } = useSimpleAlerts();
  const { savedAlerts, toggleSaveAlert } = useSavedAlerts();
  
  // State for dashboard functionality (matching landing page)
  const [selectedAgency, setSelectedAgency] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showExportManager, setShowExportManager] = useState(false);
  
  // User preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    urgencyThreshold: 'Medium',
    preferredSources: ['FDA', 'USDA', 'EPA'],
    industries: ['Food Safety']
  });

  // Get filtered alerts for display (same logic as landing page)
  const displayAlerts = useMemo(() => {
    console.log('[UserDashboard] Processing alerts:', {
      totalAlerts: alerts.length,
      searchQuery,
      selectedAgency,
      sampleAlert: alerts[0]
    });
    
    let filtered = alerts;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(query) ||
        alert.summary.toLowerCase().includes(query) ||
        alert.source.toLowerCase().includes(query)
      );
      console.log('[UserDashboard] After search filter:', filtered.length);
    }
    
    // Apply agency filter
    if (selectedAgency) {
      filtered = filtered.filter(alert => {
        const sourceMatch = alert.source.toLowerCase() === selectedAgency.toLowerCase();
        return sourceMatch;
      });
      console.log('[UserDashboard] After agency filter:', filtered.length);
    }
    
    const result = filtered.slice(0, 20); // Show more alerts in dashboard
    console.log('[UserDashboard] Final displayAlerts:', {
      length: result.length,
      loading,
      sampleTitles: result.slice(0, 3).map(a => a.title)
    });
    
    return result;
  }, [alerts, selectedAgency, searchQuery, loading]);

  // Agency filter counts (same as landing page)
  const agencyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'].forEach(agency => {
      counts[agency] = alerts.filter(alert => alert.source === agency).length;
    });
    return counts;
  }, [alerts]);

  const getAgencyColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('fda')) return 'text-red-600 bg-red-50 border-red-200';
    if (sourceLower.includes('usda')) return 'text-green-600 bg-green-50 border-green-200';
    if (sourceLower.includes('epa')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (sourceLower.includes('cdc')) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const handlePreferencesUpdate = () => {
    // TODO: Update user preferences in database
    setPreferencesOpen(false);
    console.log('Updated preferences:', preferences);
  };

  const clearFilters = () => {
    setSelectedAgency('');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">RegIQ</span>
            </div>
          </div>
          <nav className="flex items-center space-x-4">
            <Badge variant="secondary" className="hidden md:flex">
              Welcome, {user?.email}
            </Badge>
            <Button 
              variant="default" 
              size="sm" 
              asChild 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md px-3 md:px-4"
            >
              <Link to="/search" className="flex items-center gap-1.5 md:gap-2">
                <Search className="h-4 w-4 shrink-0" />
                <span>Advanced Search</span>
                <Badge variant="secondary" className="bg-white/20 text-white text-xs px-1.5 py-0.5 shrink-0">
                  PRO
                </Badge>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 pb-20 md:pb-8">{/* Extra padding bottom for mobile nav */}
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Regulatory Dashboard</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest regulatory alerts, chat with AI, and run advanced searches.
          </p>
        </div>

        {/* Main Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto p-2">
            <TabsTrigger value="alerts" className="flex items-center gap-2 px-3 py-2 text-sm">
              <Bell className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Live Alerts</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2 px-3 py-2 text-sm">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Risk Intel</span>
              <span className="sm:hidden">Risk</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2 px-3 py-2 text-sm">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">AI Assistant</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="advanced-search" className="flex items-center gap-2 px-3 py-2 text-sm">
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Advanced Search</span>
              <span className="sm:hidden">Search</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 px-3 py-2 text-sm">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Live Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saved Alerts</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{savedAlerts.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total alerts saved
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alerts.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery || selectedAgency ? `${displayAlerts.length} filtered` : 'All sources'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Freshness</CardTitle>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Live</div>
                  <p className="text-xs text-muted-foreground">
                    Real-time monitoring
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter Section */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                <div className="flex-1 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts by title, content, or agency..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-medium">Filter:</label>
                  <Button
                    variant={selectedAgency === '' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAgency('')}
                    className="text-xs"
                  >
                    All ({alerts.length})
                  </Button>
                  {['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'].map(agency => {
                    const count = agencyCounts[agency] || 0;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={agency}
                        variant={selectedAgency === agency ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedAgency(agency)}
                        className="text-xs"
                      >
                        {agency} ({count})
                      </Button>
                    );
                  })}
                  
                  {(searchQuery || selectedAgency) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Feed Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">
                  {searchQuery || selectedAgency ? 'Filtered Alerts' : 'Latest Regulatory Updates'}
                </h2>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live Feed • {displayAlerts.length} alerts
                </Badge>
              </div>
              
              {/* Alert Feed */}
              <div className="grid gap-4">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                      </CardHeader>
                    </Card>
                  ))
                ) : displayAlerts.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground">
                        No alerts found matching your current filters.
                        {(searchQuery || selectedAgency) && (
                          <Button variant="outline" onClick={clearFilters} className="mt-4 block mx-auto">
                            Clear Filters
                          </Button>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  displayAlerts.map((alert) => (
                    <PerplexityAlertCard
                      key={alert.id}
                      alert={alert}
                      onDismissAlert={() => {}} // TODO: Implement dismiss functionality
                      onSaveAlert={(alert) => toggleSaveAlert(alert.id)}
                      savedAlerts={[]} // TODO: Convert savedAlerts to proper format
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Risk Intelligence Tab */}
          <TabsContent value="risk" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Risk Predictor
                  </CardTitle>
                  <CardDescription>
                    Analyze product descriptions for food safety risks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get instant risk assessments and recommendations for your food products.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/risk-predictor">
                      Start Risk Analysis
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Risk Dashboard
                  </CardTitle>
                  <CardDescription>
                    View risk trends and insights across categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Monitor food safety trends with interactive charts and key insights.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/risk-dashboard">
                      View Dashboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Risk Intelligence Overview</CardTitle>
                <CardDescription>
                  AI-powered food safety risk assessment and prediction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">2.3</div>
                    <p className="text-sm text-muted-foreground">Average Risk Score</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">8</div>
                    <p className="text-sm text-muted-foreground">Product Categories</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">94%</div>
                    <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">AI Assistant</h2>
                <p className="text-muted-foreground text-lg">
                  Ask questions about FDA, USDA, EPA regulations in plain English. Get fast answers with sources.
                </p>
              </div>
              
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">AI Assistant</h3>
                  <Badge variant="secondary">GPT-4.1 + Live Data</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• “Most recent FDA recalls”</li>
                      <li>• “USDA labeling rules for poultry”</li>
                      <li>• “EPA pesticide MRL updates this week”</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Behavior</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Prioritizes your live dashboard alerts</li>
                      <li>• Shows timestamps and sources</li>
                      <li>• Plain-English answers</li>
                    </ul>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setIsChatOpen(true)}
                  className="w-full py-6 text-lg"
                  size="lg"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Open AI Assistant
                </Button>
                
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Answers cite sources and use your live dashboard first.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Advanced Search Tab */}
          <TabsContent value="advanced-search" className="space-y-6">
            <div className="max-w-6xl mx-auto">
              <RegulatorySearch />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>
                  Customize your RegIQ experience and notification settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="email-notifications"
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, emailNotifications: checked as boolean }))
                    }
                  />
                  <label htmlFor="email-notifications" className="text-sm">
                    Enable email notifications
                  </label>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Urgency Threshold</label>
                  <Select 
                    value={preferences.urgencyThreshold} 
                    onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, urgencyThreshold: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Sources</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'].map(source => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox 
                          id={source}
                          checked={preferences.preferredSources.includes(source)}
                          onCheckedChange={(checked) => {
                            setPreferences(prev => ({
                              ...prev,
                              preferredSources: checked 
                                ? [...prev.preferredSources, source]
                                : prev.preferredSources.filter(s => s !== source)
                            }));
                          }}
                        />
                        <label htmlFor={source} className="text-sm">{source}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button onClick={handlePreferencesUpdate}>
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Data Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Export your alerts, search history, and analytics for backup or analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export Your Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download your regulatory alerts, AI search history, and usage analytics in various formats.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowExportManager(true)}
                    className="ml-4"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Manager Dialog */}
            <Dialog open={showExportManager} onOpenChange={setShowExportManager}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Export Data</DialogTitle>
                  <DialogDescription>
                    Download your RegIQ data in various formats for backup, analysis, or integration.
                  </DialogDescription>
                </DialogHeader>
                <ExportManager 
                  isOpen={showExportManager}
                  onClose={() => setShowExportManager(false)}
                />
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Chatbot */}
      <ConversationalChatbot 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />

      {/* Support Widget */}
      <SupportWidget />
    </div>
  );
};

export default UserDashboard;
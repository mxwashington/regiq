import React, { useState, useMemo, useCallback } from 'react';
import { DashboardMetrics } from './DashboardMetrics';
import { DashboardNavigation } from './DashboardNavigation';
import { RegIQFeed } from './RegIQFeed';
import { SearchInterface } from './SearchInterface';
import { RiskIntelligenceDashboard } from './RiskIntelligenceDashboard';

import { SavedItems } from './SavedItems';
import { AgencyFilter } from './alerts/AgencyFilter';
import { SourceMappingDebug } from './debug/SourceMappingDebug';
import { ConversationalChatbot } from './ConversationalChatbot';
import { TrialGate } from './TrialGate';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { useAlertFilters } from '@/hooks/useAlertFilters';
import { useSavedAlerts } from '@/hooks/useSavedAlerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X, User, Settings, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DashboardFilters {
  timePeriod?: string;
  priorities?: string[];
  agencies?: string[];
  showSavedOnly?: boolean;
}

export function MainDashboard() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({});
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Auth and filtering
  const { user } = useAuth();
  const { filters } = useAlertFilters();

  // Fetch all alerts with current filters
  const { alerts, loading, error, totalCount } = useSimpleAlerts(50, filters);
  const { savedAlerts, toggleSaveAlert } = useSavedAlerts();

  // Simple freshness indicator logic
  const getDataFreshness = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check if we have recent alerts
    const recentAlerts = alerts.filter(alert =>
      new Date(alert.published_date) >= oneHourAgo
    ).length;

    if (recentAlerts > 0) {
      return { status: 'fresh', label: 'Fresh', icon: CheckCircle, color: 'text-green-600' };
    } else if (alerts.length > 0) {
      return { status: 'stale', label: 'Updating...', icon: Clock, color: 'text-yellow-600' };
    } else {
      return { status: 'error', label: 'Check Connection', icon: AlertCircle, color: 'text-red-600' };
    }
  };

  const freshness = getDataFreshness();
  
  // Calculate metrics
  const metrics = useMemo(() => {
    if (!alerts.length) return { newUpdatesCount: 0, highPriorityCount: 0 };
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const newUpdatesCount = alerts.filter(alert => 
      new Date(alert.published_date) >= yesterday
    ).length;
    
    const highPriorityCount = alerts.filter(alert => 
      alert.urgency?.toLowerCase() === 'high'
    ).length;
    
    return { newUpdatesCount, highPriorityCount };
  }, [alerts]);

  const handleMetricClick = useCallback((filter: string) => {
    setActiveTab('alerts');
    
    switch (filter) {
      case 'new-updates':
        setDashboardFilters({ timePeriod: 'Last 24 hours' });
        break;
      case 'high-priority':
        setDashboardFilters({ priorities: ['High'] });
        break;
      case 'active-alerts':
        setDashboardFilters({});
        break;
      case 'coverage':
        // Could show agency details modal
        break;
    }
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Clear filters when switching tabs
    setDashboardFilters({});
  }, []);

  // Handle save alert - convert Alert object to alertId string
  const handleSaveAlert = (alert: any) => {
    const alertId = typeof alert === 'string' ? alert : alert.id;
    toggleSaveAlert(alertId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'alerts':
        return (
          <RegIQFeed
            onSaveAlert={handleSaveAlert}
            savedAlerts={alerts.filter(alert => savedAlerts.some(saved => saved.id === alert.id))}
          />
        );
      case 'search':
        return (
          <SearchInterface 
            alerts={alerts}
            onSaveAlert={(alertId: string) => toggleSaveAlert(alertId)}
            savedAlerts={alerts.filter(alert => savedAlerts.some(saved => saved.id === alert.id))}
          />
        );
      case 'saved':
        return (
          <SavedItems 
            savedAlerts={alerts.filter(alert => savedAlerts.some(saved => saved.id === alert.id))}
            onUnsaveAlert={handleSaveAlert}
          />
        );
      case 'risk':
        return <RiskIntelligenceDashboard />;
      case 'account':
        return (
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
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <a href="/account">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
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
        );
      default:
        return (
          <RegIQFeed
            onSaveAlert={handleSaveAlert}
            savedAlerts={alerts.filter(alert => savedAlerts.some(saved => saved.id === alert.id))}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load dashboard</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <TrialGate>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Regulatory Intelligence Dashboard
              </h1>
              <Badge variant="outline" className={`${freshness.color} border-current`}>
                <freshness.icon className="h-3 w-3 mr-1" />
                {freshness.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Stay informed with real-time regulatory updates from FDA, USDA, EPA, and more
            </p>
          </div>
          
          <DashboardMetrics 
            totalAlerts={totalCount}
            highPriorityCount={metrics.highPriorityCount}
            newUpdatesCount={metrics.newUpdatesCount}
            onMetricClick={handleMetricClick}
          />
        </div>
      </div>

      {/* Navigation */}
      <DashboardNavigation 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        savedItemsCount={savedAlerts.length}
      />

      {/* Content with Filter Sidebar */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar - Desktop */}
          <div className={cn(
            "hidden lg:block lg:w-80 flex-shrink-0 transition-all duration-300",
            activeTab === 'alerts' || activeTab === 'search' ? 'block' : 'hidden'
          )}>
            {(activeTab === 'alerts' || activeTab === 'search') && (
              <div className="sticky top-6">
                <AgencyFilter />
              </div>
            )}
          </div>

          {/* Mobile Filter Toggle */}
          <div className={cn(
            "lg:hidden fixed top-20 right-4 z-50",
            activeTab === 'alerts' || activeTab === 'search' ? 'block' : 'hidden'
          )}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
              className="bg-background border-2 shadow-lg"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Mobile Filter Sidebar Overlay */}
          {isFilterSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsFilterSidebarOpen(false)}>
              <div className="fixed right-0 top-0 h-full w-80 bg-background shadow-xl transform transition-transform overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Filters</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFilterSidebarOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <AgencyFilter />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Temporary Debug Component */}
            <div className="mb-4">
              <SourceMappingDebug />
            </div>

            {/* Filter Status Bar for Mobile */}
            {(activeTab === 'alerts' || activeTab === 'search') && (
              <div className="lg:hidden mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {totalCount} alerts
                  </span>
                  <span className="text-muted-foreground">
                    {filters.sources.length < 5 ? `${filters.sources.length} sources` : 'All sources'}
                    {filters.searchQuery && ' • Filtered'}
                  </span>
                </div>
              </div>
            )}
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <ConversationalChatbot
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
    </TrialGate>
  );
}
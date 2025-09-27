import React, { useState, useMemo, useCallback } from 'react';
import { DashboardMetrics } from './DashboardMetrics';
import { DashboardNavigation } from './DashboardNavigation';
import { RegIQFeed } from './RegIQFeed';
import { SearchInterface } from './SearchInterface';
import { ThirdShiftAI } from '@/components/stubs/MissingComponents';
import { SavedItems } from './SavedItems';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { useAlertFilters } from '@/hooks/useAlertFilters';
import { useSavedAlerts } from '@/hooks/useSavedAlerts';

interface DashboardFilters {
  timePeriod?: string;
  priorities?: string[];
  agencies?: string[];
  showSavedOnly?: boolean;
}

export function MainDashboard() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({});
  
  // Use alert filters hook for filtering
  const { filters } = useAlertFilters();
  
  // Fetch all alerts with current filters
  const { alerts, loading, error, totalCount } = useSimpleAlerts(50, filters);
  const { savedAlerts, toggleSaveAlert } = useSavedAlerts();
  
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

  // Get ThirdShift status from error boundary or service
  const thirdShiftStatus = 'connected'; // TODO: Implement real status check

  const renderTabContent = () => {
    switch (activeTab) {
      case 'alerts':
        return (
          <RegIQFeed 
            initialFilters={dashboardFilters}
            onSaveAlert={toggleSaveAlert}
            savedAlerts={savedAlerts}
          />
        );
      case 'search':
        return (
          <SearchInterface 
            alerts={alerts}
            onSaveAlert={toggleSaveAlert}
            savedAlerts={savedAlerts}
          />
        );
      case 'saved':
        return (
          <SavedItems 
            savedAlerts={savedAlerts}
            onUnsaveAlert={toggleSaveAlert}
          />
        );
      case 'thirdshift':
        return <ThirdShiftAI />;
      default:
        return (
          <RegIQFeed 
            initialFilters={dashboardFilters}
            onSaveAlert={toggleSaveAlert}
            savedAlerts={savedAlerts}
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Regulatory Intelligence Dashboard
            </h1>
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
        thirdShiftStatus={thirdShiftStatus}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {renderTabContent()}
      </div>
    </div>
  );
}
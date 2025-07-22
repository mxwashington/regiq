import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Tags, TrendingUp, AlertTriangle, Clock, X, Trash2, RefreshCw, Bug } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TagFilter from './TagFilter';
import TaggedAlertCard from './TaggedAlertCard';
import SimpleAlertCard from './SimpleAlertCard';
import { AlertsErrorBoundary } from './AlertsErrorBoundary';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { useTaggedAlerts } from '@/hooks/useTaggedAlerts';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { debugRegIQ } from '@/lib/debug-utils';

interface ActiveFilter {
  categoryId: string;
  categoryName: string;
  tagId: string;
  tagName: string;
  color: string;
}

export function AlertsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [updatingFDA, setUpdatingFDA] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load taxonomy data
  const { categories: taxonomyCategories, loading: taxonomyLoading, error: taxonomyError } = useTaxonomy();
  
  // Load alerts with enhanced error handling
  const { 
    alerts: taggedAlerts, 
    loading: taggedAlertsLoading, 
    error: taggedAlertsError,
    retryCount: taggedRetryCount,
    retryLoad: retryTagged
  } = useTaggedAlerts({ 
    filters: activeFilters,
    limit: 100 
  });
  
  // Always load simple alerts as fallback
  const { 
    alerts: simpleAlerts, 
    loading: simpleAlertsLoading,
    error: simpleAlertsError,
    retryCount: simpleRetryCount,
    retryLoad: retrySimple
  } = useSimpleAlerts(100);
  
  // Smart fallback logic
  const useSimpleFallback = !!taggedAlertsError || taggedAlerts.length === 0;
  const alerts = useSimpleFallback ? simpleAlerts : taggedAlerts;
  const alertsLoading = useSimpleFallback ? simpleAlertsLoading : taggedAlertsLoading;
  const alertsError = useSimpleFallback ? simpleAlertsError : taggedAlertsError;
  
  // Enhanced debugging info
  React.useEffect(() => {
    console.log('[AlertsDashboard] State:', {
      taggedAlertsError,
      taggedAlertsCount: taggedAlerts?.length,
      simpleAlertsCount: simpleAlerts?.length,
      usingSimpleFallback: useSimpleFallback,
      activeFiltersCount: activeFilters.length,
      taxonomyError,
      simpleAlertsError,
      alertsLoading,
      taggedRetryCount,
      simpleRetryCount
    });
  }, [
    taggedAlertsError, 
    taggedAlerts?.length, 
    simpleAlerts?.length, 
    useSimpleFallback,
    activeFilters.length,
    taxonomyError,
    simpleAlertsError,
    alertsLoading,
    taggedRetryCount,
    simpleRetryCount
  ]);

  // Filter alerts by search term and dismissed status
  const filteredAlerts = React.useMemo(() => {
    if (!alerts || alerts.length === 0) return [];
    
    let filtered = alerts;
    
    // Filter by dismissed status
    if (!showDismissed && user) {
      filtered = filtered.filter(alert => {
        const dismissedBy = (alert as any).dismissed_by;
        return !dismissedBy || !dismissedBy.includes(user.id);
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.source?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [alerts, searchTerm, showDismissed, user]);

  const handleTagClick = (categoryName: string, tagId: string, tagName: string) => {
    const category = taxonomyCategories.find(c => c.name === categoryName);
    if (!category) return;

    const tag = category.tags.find(t => t.id === tagId);
    if (!tag) return;

    const newFilter: ActiveFilter = {
      categoryId: category.id,
      categoryName,
      tagId,
      tagName,
      color: tag.color
    };

    // Replace any existing filter in this category
    const newFilters = activeFilters.filter(f => f.categoryId !== category.id);
    newFilters.push(newFilter);
    setActiveFilters(newFilters);
  };

  const handleFilterChange = (filters: ActiveFilter[]) => {
    setActiveFilters(filters);
  };

  // Alert clearing functions
  const dismissAlert = async (alertId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.rpc('dismiss_alert_for_user', {
        alert_id: alertId,
        user_id: user.id
      });
      
      if (error) throw error;
      
      toast({
        title: "Alert dismissed",
        description: "The alert has been removed from your view."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to dismiss alert.",
        variant: "destructive"
      });
    }
  };

  const clearAllAlerts = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.rpc('clear_all_alerts_for_user', {
        user_id: user.id
      });
      
      if (error) throw error;
      
      toast({
        title: "All alerts cleared",
        description: "All recent alerts have been dismissed."
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to clear alerts.",
        variant: "destructive"
      });
    }
  };

  // FDA data refresh function
  const refreshFDAData = async () => {
    if (!user) return;
    
    setUpdatingFDA(true);
    try {
      const { data, error } = await supabase.functions.invoke('fda-data-feed', {
        body: { action: 'fetch_recent_recalls', days: 7 }
      });
      
      if (error) throw error;
      
      toast({
        title: "FDA data updated",
        description: `${data.processed || 0} new FDA alerts added to feed.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update FDA data.",
        variant: "destructive"
      });
    } finally {
      setUpdatingFDA(false);
    }
  };

  // Debug and retry functions
  const runDebug = async () => {
    setDebugMode(true);
    try {
      const debugInfo = await debugRegIQ();
      console.log('Debug results:', debugInfo);
      
      toast({
        title: 'Debug Complete',
        description: `Found ${debugInfo.errors.length} issues. Check console for details.`,
        variant: debugInfo.errors.length > 0 ? 'destructive' : 'default'
      });
    } catch (error) {
      console.error('Debug failed:', error);
      toast({
        title: 'Debug Failed',
        description: 'Could not run diagnostic. Check console.',
        variant: 'destructive'
      });
    } finally {
      setDebugMode(false);
    }
  };

  const handleRetryAll = () => {
    console.log('[AlertsDashboard] Retrying all data loading...');
    if (retryTagged) retryTagged();
    if (retrySimple) retrySimple();
  };

  // Calculate stats
  const totalAlerts = filteredAlerts.length;
  const highPriorityAlerts = filteredAlerts.filter(alert => 
    alert.urgency.toLowerCase() === 'high'
  ).length;
  
  const recentAlerts = filteredAlerts.filter(alert => {
    const alertDate = new Date(alert.published_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return alertDate >= weekAgo;
  }).length;

  const uniqueSources = new Set(filteredAlerts.map(alert => alert.source)).size;

  // Group alerts by urgency for tabs
  const alertsByUrgency = {
    all: filteredAlerts,
    high: filteredAlerts.filter(a => a.urgency.toLowerCase() === 'high'),
    medium: filteredAlerts.filter(a => a.urgency.toLowerCase() === 'medium'),
    low: filteredAlerts.filter(a => a.urgency.toLowerCase() === 'low')
  };

  // Handle critical errors
  if (simpleAlertsError && taggedAlertsError) {
    return (
      <AlertsErrorBoundary>
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Failed to Load Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Unable to load regulatory alerts from the database.
            </p>
            
            <div className="grid gap-2 text-sm">
              <div><strong>Tagged Alerts Error:</strong> {taggedAlertsError}</div>
              <div><strong>Simple Alerts Error:</strong> {simpleAlertsError}</div>
              {simpleRetryCount > 0 && <div><strong>Retry Attempts:</strong> {simpleRetryCount}</div>}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleRetryAll} disabled={alertsLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${alertsLoading ? 'animate-spin' : ''}`} />
                Retry Loading
              </Button>
              <Button onClick={runDebug} variant="outline" disabled={debugMode}>
                <Bug className={`h-4 w-4 mr-2 ${debugMode ? 'animate-pulse' : ''}`} />
                {debugMode ? 'Running...' : 'Debug'}
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </AlertsErrorBoundary>
    );
  }

  if (taxonomyLoading || alertsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading regulatory alerts...</p>
          {(taggedRetryCount > 0 || simpleRetryCount > 0) && (
            <p className="text-xs text-muted-foreground mt-1">
              Retry attempt {Math.max(taggedRetryCount, simpleRetryCount)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AlertsErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Regulatory Alerts</h1>
            <p className="text-muted-foreground">
              {useSimpleFallback ? 
                'Showing basic alerts (enhanced features unavailable)' : 
                'AI-powered classification and filtering of regulatory content'
              }
            </p>
            {(taggedAlertsError || simpleAlertsError) && (
              <p className="text-xs text-amber-600 mt-1">
                Some features may be limited due to connectivity issues
              </p>
            )}
          </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshFDAData}
            disabled={updatingFDA}
            className="flex items-center gap-2"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${updatingFDA ? 'animate-spin' : ''}`} />
            Update FDA Data
          </Button>
          <Button
            variant="outline"
            onClick={runDebug}
            disabled={debugMode}
            className="flex items-center gap-2"
            size="sm"
          >
            <Bug className={`h-4 w-4 ${debugMode ? 'animate-pulse' : ''}`} />
            {debugMode ? 'Running...' : 'Debug'}
          </Button>
          <Button
            variant={showDismissed ? "secondary" : "outline"}
            onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center gap-2"
            size="sm"
          >
            <X className="h-4 w-4" />
            {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
          </Button>
          <Button
            variant="outline"
            onClick={clearAllAlerts}
            className="flex items-center gap-2"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
            disabled={useSimpleFallback}
          >
            <Tags className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {useSimpleFallback && ' (Unavailable)'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className={`flex-1 space-y-6 ${showFilters ? 'lg:w-2/3' : 'w-full'}`}>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search alerts by title, content, or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  {activeFilters.length > 0 ? 'Filtered results' : 'All alerts'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  High Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{highPriorityAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  Immediate attention required
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  Published in last 7 days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueSources}</div>
                <p className="text-xs text-muted-foreground">
                  Unique alert sources
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts by Priority Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({alertsByUrgency.all.length})</TabsTrigger>
              <TabsTrigger value="high" className="text-red-600">High ({alertsByUrgency.high.length})</TabsTrigger>
              <TabsTrigger value="medium" className="text-orange-600">Medium ({alertsByUrgency.medium.length})</TabsTrigger>
              <TabsTrigger value="low" className="text-green-600">Low ({alertsByUrgency.low.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <AlertsList 
                alerts={alertsByUrgency.all} 
                onTagClick={handleTagClick} 
                hasTaggedAlertsError={useSimpleFallback} 
                onDismissAlert={dismissAlert} 
              />
            </TabsContent>
            <TabsContent value="high" className="space-y-4">
              <AlertsList 
                alerts={alertsByUrgency.high} 
                onTagClick={handleTagClick} 
                hasTaggedAlertsError={useSimpleFallback} 
                onDismissAlert={dismissAlert} 
              />
            </TabsContent>
            <TabsContent value="medium" className="space-y-4">
              <AlertsList 
                alerts={alertsByUrgency.medium} 
                onTagClick={handleTagClick} 
                hasTaggedAlertsError={useSimpleFallback} 
                onDismissAlert={dismissAlert} 
              />
            </TabsContent>
            <TabsContent value="low" className="space-y-4">
              <AlertsList 
                alerts={alertsByUrgency.low} 
                onTagClick={handleTagClick} 
                hasTaggedAlertsError={useSimpleFallback} 
                onDismissAlert={dismissAlert} 
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Filters */}
        {showFilters && !useSimpleFallback && (
          <div className="lg:w-1/3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Tag Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TagFilter
                  taxonomyData={{ categories: taxonomyCategories }}
                  activeFilters={activeFilters}
                  onFilterChange={handleFilterChange}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </AlertsErrorBoundary>
  );
}

interface AlertsListProps {
  alerts: any[];
  onTagClick: (categoryName: string, tagId: string, tagName: string) => void;
  hasTaggedAlertsError: boolean;
  onDismissAlert: (alertId: string) => void;
}

function AlertsList({ alerts, onTagClick, hasTaggedAlertsError, onDismissAlert }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No alerts found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search criteria or check back later for new alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {alerts.map((alert) => {
        // Check if this is a tagged alert or simple alert
        const hasAlertTags = alert.alert_tags && Array.isArray(alert.alert_tags);
        
        if (hasAlertTags && !hasTaggedAlertsError) {
          return (
            <TaggedAlertCard
              key={alert.id}
              alert={alert}
              onTagClick={onTagClick}
              onDismissAlert={onDismissAlert}
            />
          );
        } else {
          return (
            <SimpleAlertCard
              key={alert.id}
              alert={alert}
              onDismissAlert={onDismissAlert}
            />
          );
        }
      })}
    </div>
  );
}
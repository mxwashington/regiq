import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, TrendingUp, AlertTriangle, Clock, X, Trash2, RefreshCw, Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedRegulatoryFilter } from './EnhancedRegulatoryFilter';
import TaggedAlertCard from './TaggedAlertCard';
import PerplexityAlertCard from './PerplexityAlertCard';

interface Alert {
  id: string;
  title: string;
  summary: string;
  source: string;
  urgency: string;
  published_date: string;
  external_url?: string;
  full_content?: string;
  dismissed_by?: string[];
  alert_tags?: any[];
}

interface FilterState {
  regions: string[];
  agencies: string[];
  urgency: string[];
  dateRange: string;
  showInactive: boolean;
}

export function EnhancedAlertsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    regions: [],
    agencies: [],
    urgency: [],
    dateRange: 'all',
    showInactive: false
  });

  const { toast } = useToast();
  const { user } = useAuth();

  // Load alerts
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // Try tagged alerts first, fall back to simple alerts
      let { data: taggedAlerts, error: taggedError } = await supabase
        .from('alerts')
        .select(`
          *,
          alert_tags (
            id,
            tag_id,
            confidence_score,
            is_primary
          )
        `)
        .order('published_date', { ascending: false })
        .limit(200);

      if (taggedError || !taggedAlerts) {
        // Fallback to simple alerts
        const { data: simpleAlerts, error: simpleError } = await supabase
          .from('alerts')
          .select('*')
          .order('published_date', { ascending: false })
          .limit(200);

        if (simpleError) throw simpleError;
        setAlerts(simpleAlerts || []);
      } else {
        setAlerts(taggedAlerts);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load regulatory alerts.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter alerts based on current filters and search
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    // Filter by dismissed status
    if (!showDismissed && user) {
      filtered = filtered.filter(alert => 
        !alert.dismissed_by || !alert.dismissed_by.includes(user.id)
      );
    }

    // Filter by search term
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(query) ||
        alert.summary.toLowerCase().includes(query) ||
        alert.source.toLowerCase().includes(query)
      );
    }

    // Filter by agencies
    if (filters.agencies.length > 0) {
      filtered = filtered.filter(alert =>
        filters.agencies.some(agency => 
          alert.source.toLowerCase().includes(agency.toLowerCase())
        )
      );
    }

    // Filter by urgency
    if (filters.urgency.length > 0) {
      filtered = filtered.filter(alert =>
        filters.urgency.includes(alert.urgency)
      );
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(alert =>
        new Date(alert.published_date) >= cutoffDate
      );
    }

    return filtered;
  }, [alerts, searchTerm, filters, showDismissed, user]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredAlerts.length;
    const high = filteredAlerts.filter(a => a.urgency.toLowerCase() === 'high').length;
    const recent = filteredAlerts.filter(a => {
      const alertDate = new Date(a.published_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return alertDate >= weekAgo;
    }).length;
    const sources = new Set(filteredAlerts.map(a => a.source)).size;

    return { total, high, recent, sources };
  }, [filteredAlerts]);

  // Group alerts by urgency
  const alertsByUrgency = useMemo(() => ({
    all: filteredAlerts,
    high: filteredAlerts.filter(a => a.urgency.toLowerCase() === 'high'),
    medium: filteredAlerts.filter(a => a.urgency.toLowerCase() === 'medium'),
    low: filteredAlerts.filter(a => a.urgency.toLowerCase() === 'low')
  }), [filteredAlerts]);

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
      
      await loadAlerts(); // Refresh alerts
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
      
      await loadAlerts(); // Refresh alerts
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear alerts.",
        variant: "destructive"
      });
    }
  };

  const refreshData = async (options?: { region?: string; agency?: string; force?: boolean }) => {
    try {
      setRefreshing(true);
      
      const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-pipeline', {
        body: {
          region: options?.region,
          agency: options?.agency,
          force_refresh: options?.force || false
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Data refreshed",
        description: `${data.totalAlertsProcessed || 0} new alerts added to the system.`
      });
      
      await loadAlerts(); // Reload alerts
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh regulatory data.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading global regulatory alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Global Regulatory Intelligence
          </h1>
          <p className="text-muted-foreground">
            AI-powered monitoring of regulatory updates from agencies worldwide
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refreshData({ force: true })}
            disabled={refreshing}
            className="flex items-center gap-2"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All Data
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
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="lg:w-1/3 space-y-4">
            <EnhancedRegulatoryFilter
              onFiltersChange={setFilters}
              onRefreshData={refreshData}
              loading={refreshing}
            />
          </div>
        )}

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
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== 'all' && f !== false)
                    ? 'Filtered results' 
                    : 'All alerts'
                  }
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
                <div className="text-2xl font-bold text-red-600">{stats.high}</div>
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
                <div className="text-2xl font-bold">{stats.recent}</div>
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
                <div className="text-2xl font-bold">{stats.sources}</div>
                <p className="text-xs text-muted-foreground">
                  Global regulatory agencies
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
              <AlertsList alerts={alertsByUrgency.all} onDismissAlert={dismissAlert} />
            </TabsContent>
            <TabsContent value="high" className="space-y-4">
              <AlertsList alerts={alertsByUrgency.high} onDismissAlert={dismissAlert} />
            </TabsContent>
            <TabsContent value="medium" className="space-y-4">
              <AlertsList alerts={alertsByUrgency.medium} onDismissAlert={dismissAlert} />
            </TabsContent>
            <TabsContent value="low" className="space-y-4">
              <AlertsList alerts={alertsByUrgency.low} onDismissAlert={dismissAlert} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface AlertsListProps {
  alerts: Alert[];
  onDismissAlert: (alertId: string) => void;
}

function AlertsList({ alerts, onDismissAlert }: AlertsListProps) {
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
        const hasAlertTags = alert.alert_tags && Array.isArray(alert.alert_tags) && alert.alert_tags.length > 0;
        
        if (hasAlertTags) {
          return (
            <TaggedAlertCard
              key={alert.id}
              alert={alert}
              onTagClick={() => {}} // Placeholder for tag click handler
              onDismissAlert={onDismissAlert}
            />
          );
        } else {
          return (
            <PerplexityAlertCard
              key={alert.id}
              alert={alert}
              onDismissAlert={onDismissAlert}
              savedAlerts={[]}
            />
          );
        }
      })}
    </div>
  );
}
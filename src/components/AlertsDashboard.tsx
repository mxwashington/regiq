import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Tags, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TagFilter from './TagFilter';
import TaggedAlertCard from './TaggedAlertCard';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { useTaggedAlerts } from '@/hooks/useTaggedAlerts';

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
  const { toast } = useToast();

  // Load taxonomy data
  const { categories: taxonomyCategories, loading: taxonomyLoading } = useTaxonomy();
  
  // Load alerts with current filters
  const { alerts, loading: alertsLoading } = useTaggedAlerts({ 
    filters: activeFilters,
    limit: 100 
  });

  // Filter alerts by search term
  const filteredAlerts = React.useMemo(() => {
    if (!searchTerm) return alerts;
    
    return alerts.filter(alert =>
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [alerts, searchTerm]);

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

  if (taxonomyLoading || alertsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading regulatory alerts and taxonomy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Alerts</h1>
          <p className="text-muted-foreground">
            AI-powered classification and filtering of regulatory content
          </p>
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Tags className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
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
              <AlertsList alerts={alertsByUrgency.all} onTagClick={handleTagClick} />
            </TabsContent>
            <TabsContent value="high" className="space-y-4">
              <AlertsList alerts={alertsByUrgency.high} onTagClick={handleTagClick} />
            </TabsContent>
            <TabsContent value="medium" className="space-y-4">
              <AlertsList alerts={alertsByUrgency.medium} onTagClick={handleTagClick} />
            </TabsContent>
            <TabsContent value="low" className="space-y-4">
              <AlertsList alerts={alertsByUrgency.low} onTagClick={handleTagClick} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Filters */}
        {showFilters && (
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
  );

  interface AlertsListProps {
    alerts: any[];
    onTagClick: (categoryName: string, tagId: string, tagName: string) => void;
  }

  function AlertsList({ alerts, onTagClick }: AlertsListProps) {
    if (alerts.length === 0) {
      return (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No alerts found</h3>
          <p className="text-muted-foreground">
            {activeFilters.length > 0 
              ? 'Try adjusting your tag filters or search criteria.'
              : 'No alerts match your search criteria.'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <TaggedAlertCard
            key={alert.id}
            alert={alert}
            onTagClick={onTagClick}
          />
        ))}
      </div>
    );
  }
}
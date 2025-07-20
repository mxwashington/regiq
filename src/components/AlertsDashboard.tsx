import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Search, Filter, AlertTriangle, Info, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  title: string;
  source: string;
  urgency: string;
  summary: string;
  published_date: string;
  external_url?: string;
}

export function AlertsDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, searchTerm, sourceFilter, urgencyFilter]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('published_date', { ascending: false });

      if (error) throw error;

      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error loading alerts",
        description: "Failed to load regulatory alerts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAlerts = () => {
    let filtered = alerts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(alert => alert.source === sourceFilter);
    }

    // Filter by urgency
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(alert => alert.urgency === urgencyFilter);
    }

    setFilteredAlerts(filtered);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'FDA': return 'border-blue-500 text-blue-700 bg-blue-50';
      case 'USDA': return 'border-green-500 text-green-700 bg-green-50';
      case 'EPA': return 'border-purple-500 text-purple-700 bg-purple-50';
      default: return 'border-gray-500 text-gray-700 bg-gray-50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <Clock className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAlertsBySource = (source: string) => {
    return filteredAlerts.filter(alert => alert.source === source);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading regulatory alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="FDA">FDA</SelectItem>
              <SelectItem value="USDA">USDA</SelectItem>
              <SelectItem value="EPA">EPA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAlerts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredAlerts.filter(a => a.urgency === 'High').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAlerts.filter(a => {
                const alertDate = new Date(a.published_date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return alertDate >= weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredAlerts.map(a => a.source)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts by Source Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({filteredAlerts.length})</TabsTrigger>
          <TabsTrigger value="FDA">FDA ({getAlertsBySource('FDA').length})</TabsTrigger>
          <TabsTrigger value="USDA">USDA ({getAlertsBySource('USDA').length})</TabsTrigger>
          <TabsTrigger value="EPA">EPA ({getAlertsBySource('EPA').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <AlertsList alerts={filteredAlerts} />
        </TabsContent>
        <TabsContent value="FDA" className="space-y-4">
          <AlertsList alerts={getAlertsBySource('FDA')} />
        </TabsContent>
        <TabsContent value="USDA" className="space-y-4">
          <AlertsList alerts={getAlertsBySource('USDA')} />
        </TabsContent>
        <TabsContent value="EPA" className="space-y-4">
          <AlertsList alerts={getAlertsBySource('EPA')} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function AlertsList({ alerts }: { alerts: Alert[] }) {
    if (alerts.length === 0) {
      return (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No alerts found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="outline" 
                      className={`${getSourceColor(alert.source)} font-medium`}
                    >
                      {alert.source}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getUrgencyColor(alert.urgency)}`}></div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        {getUrgencyIcon(alert.urgency)}
                        {alert.urgency}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(alert.published_date)}
                    </span>
                  </div>
                  <CardTitle className="text-lg leading-tight">{alert.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-base mb-4 leading-relaxed">
                {alert.summary}
              </CardDescription>
              {alert.external_url && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={alert.external_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1"
                  >
                    View Details
                    <span className="ml-1">↗</span>
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
}
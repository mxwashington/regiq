import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  Search, 
  Filter, 
  Calendar,
  ExternalLink,
  TrendingUp,
  Zap,
  Clock,
  AlertCircle,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

import { logger } from '@/lib/logger';
interface Alert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  agency: string;
  source: string;
  published_date: string;
  external_url?: string;
  created_at: string;
}

export const AlertsOnlyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { hasFeature, getFeatureValue } = useEntitlements();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null);

  const historyDays = getFeatureValue('alert_history_days') || 30;
  const maxDailyAlerts = getFeatureValue('max_daily_alerts') || 50;

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  useEffect(() => {
    filterAlerts();
  }, [alerts, searchQuery, selectedCategory, selectedAgency]);

  const fetchAlerts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const cutoffDate = subDays(new Date(), historyDays);
      
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .gte('published_date', cutoffDate.toISOString())
        .order('published_date', { ascending: false })
        .limit(200);

      if (error) {
        throw error;
      }

      setAlerts(data || []);
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const filterAlerts = () => {
    let filtered = alerts;

    if (searchQuery) {
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.summary.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(alert => alert.urgency === selectedCategory);
    }

    if (selectedAgency !== 'all') {
      filtered = filtered.filter(alert => alert.agency === selectedAgency);
    }

    setFilteredAlerts(filtered);
  };

  const handleFeatureClick = (feature: string) => {
    if (!hasFeature(feature)) {
      setPaywallFeature(feature);
      return false;
    }
    return true;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical': return <AlertCircle className="w-4 h-4" />;
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Alerts</h1>
          <p className="text-muted-foreground">
            Stay informed with real-time regulatory updates
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
            Essential Alerts
          </Badge>
          <Button
            onClick={() => handleFeatureClick('mobile_app')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Mobile App
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{filteredAlerts.length}</p>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAlerts.filter(a => a.urgency === 'Critical').length}
                </p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{historyDays}</p>
                <p className="text-sm text-muted-foreground">Days History</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleFeatureClick('advanced_analytics')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-muted-foreground">---</p>
                <p className="text-sm text-muted-foreground">Analytics</p>
              </div>
              <Zap className="w-4 h-4 ml-auto text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Want AI-powered insights?</h3>
                <p className="text-sm text-blue-700">
                  Upgrade to Starter for AI analysis, mobile access, and unlimited history
                </p>
              </div>
            </div>
            <Button 
              onClick={() => handleFeatureClick('ai_assistant')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Upgrade to Starter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                <SelectItem value="FDA">FDA</SelectItem>
                <SelectItem value="USDA">USDA</SelectItem>
                <SelectItem value="EPA">EPA</SelectItem>
                <SelectItem value="CDC">CDC</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => handleFeatureClick('advanced_filters')}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-muted rounded" />
                    <div className="h-6 w-12 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No alerts found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== 'all' || selectedAgency !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'New alerts will appear here when available.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getUrgencyColor(alert.urgency)} gap-1`}>
                        {getUrgencyIcon(alert.urgency)}
                        {alert.urgency}
                      </Badge>
                      <Badge variant="outline">{alert.agency}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(alert.published_date), 'MMM dd, yyyy')}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2 leading-tight">
                        {alert.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {alert.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Source: {alert.source}
                      </span>
                      
                      <div className="flex gap-2">
                        {alert.external_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(alert.external_url, '_blank')}
                            className="gap-1"
                          >
                            View Full Alert
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeatureClick('ai_assistant')}
                          className="gap-1 text-orange-600 hover:text-orange-700"
                        >
                          <Sparkles className="w-3 h-3" />
                          AI Analysis
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Show if at history limit */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Showing alerts from the last {historyDays} days • 
                <button 
                  onClick={() => handleFeatureClick('unlimited_history')}
                  className="text-primary hover:underline ml-1"
                >
                  Upgrade for unlimited history
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Paywall */}
      <FeaturePaywall
        isOpen={!!paywallFeature}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature as any}
        context="Essential Alerts users get the core regulatory intelligence needed to stay compliant"
      />
    </div>
  );
};
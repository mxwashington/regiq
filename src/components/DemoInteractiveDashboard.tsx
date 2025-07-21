import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  ExternalLink, 
  Download, 
  Clock, 
  TrendingUp,
  Zap,
  ArrowRight,
  Users,
  Target,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface RegulatoryAlert {
  id: string;
  title: string;
  summary: string;
  agency: string;
  urgency: 'high' | 'medium' | 'low';
  date: string;
  category: string;
  source_url: string;
  industry: string[];
  keywords: string[];
}

// Agencies, urgency levels, and categories for filtering

const agencies = ['All Agencies', 'FDA', 'USDA', 'EPA', 'EMA', 'FSIS'];
const urgencyLevels = ['All Levels', 'high', 'medium', 'low'];
const categories = ['All Categories', 'Product Recall', 'Regulation Update', 'Environmental', 'Drug Approval', 'Emergency Authorization', 'Enforcement'];

export function DemoInteractiveDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('All Agencies');
  const [selectedUrgency, setSelectedUrgency] = useState('All Levels');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedAlert, setSelectedAlert] = useState<RegulatoryAlert | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [loading, setLoading] = useState(true);
  const [demoAlerts, setDemoAlerts] = useState<RegulatoryAlert[]>([]);
  const { user } = useAuth();

  // Fetch real alerts from database with caching
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Check if we have cached data first
        const cachedData = sessionStorage.getItem('demo-alerts');
        const cacheTime = sessionStorage.getItem('demo-alerts-time');
        const now = Date.now();
        
        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
          setDemoAlerts(JSON.parse(cachedData));
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('alerts')
          .select('id, title, summary, source, urgency, published_date, external_url')
          .order('published_date', { ascending: false })
          .limit(15); // Reduced limit for faster loading

        if (error) throw error;

        // Convert database format to demo format
        const convertedAlerts = (data || []).map(alert => ({
          id: alert.id,
          title: alert.title,
          summary: alert.summary,
          agency: alert.source,
          urgency: (alert.urgency?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
          date: alert.published_date.split('T')[0],
          category: 'Regulatory Update',
          source_url: alert.external_url || '#',
          industry: ['General'],
          keywords: alert.title.toLowerCase().split(' ').slice(0, 3)
        }));

        // Cache the results
        sessionStorage.setItem('demo-alerts', JSON.stringify(convertedAlerts));
        sessionStorage.setItem('demo-alerts-time', now.toString());
        
        setDemoAlerts(convertedAlerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setDemoAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Filter alerts based on current selections
  const filteredAlerts = useMemo(() => {
    if (loading || demoAlerts.length === 0) return [];
    return demoAlerts.filter(alert => {
      const matchesSearch = !searchQuery || 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesAgency = selectedAgency === 'All Agencies' || alert.agency === selectedAgency;
      const matchesUrgency = selectedUrgency === 'All Levels' || alert.urgency === selectedUrgency;
      const matchesCategory = selectedCategory === 'All Categories' || alert.category === selectedCategory;
      
      return matchesSearch && matchesAgency && matchesUrgency && matchesCategory;
    });
  }, [demoAlerts, searchQuery, selectedAgency, selectedUrgency, selectedCategory, loading]);

  // Track interactions
  const trackInteraction = () => {
    setInteractionCount(prev => prev + 1);
    if (interactionCount === 0) {
      setShowTutorial(false);
    }
    if (interactionCount >= 3 && !user) {
      setShowSignupPrompt(true);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAgencyColor = (agency: string) => {
    switch (agency) {
      case 'FDA': return 'text-agency-fda border-agency-fda bg-red-50';
      case 'USDA': return 'text-agency-usda border-agency-usda bg-green-50';
      case 'EPA': return 'text-agency-epa border-agency-epa bg-blue-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const handleAlertClick = (alert: RegulatoryAlert) => {
    setSelectedAlert(alert);
    trackInteraction();
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    trackInteraction();
  };

  const handleFilterChange = () => {
    trackInteraction();
  };

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Tutorial Overlay */}
        {showTutorial && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
            <Card className="max-w-md mx-4 animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Try the Demo!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This is a live demo with real regulatory data. Click any alert, use the search, or try the filters to explore RegIQ's capabilities.
                </p>
                <Button onClick={() => setShowTutorial(false)} className="w-full">
                  Start Exploring
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Dashboard */}
        <div className="bg-background border rounded-lg overflow-hidden shadow-xl">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Live Regulatory Intelligence Demo</h2>
                <p className="text-primary-foreground/90">
                  {loading ? 'Loading regulatory alerts...' : `Explore ${filteredAlerts.length} active regulatory alerts`}
                </p>
              </div>
              {!user && (
                <Button variant="secondary" asChild>
                  <Link to="/auth">Get Full Access</Link>
                </Button>
              )}
            </div>

            {/* Search and Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="col-span-1 md:col-span-2">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search regulatory alerts..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Stats */}
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {loading ? '-' : demoAlerts.filter(alert => alert.urgency === 'high').length}
                  </div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {loading ? '-' : demoAlerts.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Alerts</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex flex-wrap gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select value={selectedAgency} onValueChange={(value) => { setSelectedAgency(value); handleFilterChange(); }}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {agencies.map(agency => (
                          <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter by regulatory agency</p>
                </TooltipContent>
              </Tooltip>

              <Select value={selectedUrgency} onValueChange={(value) => { setSelectedUrgency(value); handleFilterChange(); }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={(value) => { setSelectedCategory(value); handleFilterChange(); }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                if (!user) {
                  setShowSignupPrompt(true);
                } else {
                  // Handle export
                }
              }}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>

          {/* Alert List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 h-96">
            {/* Alerts Column */}
            <div className="lg:col-span-2 border-r">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading alerts...</p>
                      </div>
                    </div>
                  ) : filteredAlerts.length === 0 ? (
                    <div className="text-center text-muted-foreground p-8">
                      <p>No alerts found matching your criteria.</p>
                    </div>
                  ) : (
                    filteredAlerts.map((alert) => (
                    <Card 
                      key={alert.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleAlertClick(alert)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={getAgencyColor(alert.agency)}>
                                {alert.agency}
                              </Badge>
                              <Badge variant="outline" className={getUrgencyColor(alert.urgency)}>
                                {alert.urgency.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{alert.date}</span>
                            </div>
                            <h4 className="font-medium mb-1 line-clamp-2">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">{alert.summary}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">{alert.category}</Badge>
                              {alert.industry.slice(0, 2).map(industry => (
                                <Badge key={industry} variant="outline" className="text-xs">{industry}</Badge>
                              ))}
                            </div>
                          </div>
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.urgency === 'high' ? 'text-red-500' :
                            alert.urgency === 'medium' ? 'text-yellow-500' : 'text-green-500'
                          }`} />
                        </div>
                      </CardContent>
                    </Card>
                  )))}
                </div>
              </ScrollArea>
            </div>

            {/* Details Panel */}
            <div className="p-4">
              {selectedAlert ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getAgencyColor(selectedAlert.agency)}>
                        {selectedAlert.agency}
                      </Badge>
                      <Badge variant="outline" className={getUrgencyColor(selectedAlert.urgency)}>
                        {selectedAlert.urgency.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-2">{selectedAlert.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{selectedAlert.summary}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Industries Affected</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAlert.industry.map(industry => (
                        <Badge key={industry} variant="secondary" className="text-xs">{industry}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAlert.keywords.map(keyword => (
                        <Badge key={keyword} variant="outline" className="text-xs">{keyword}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full" onClick={() => {
                      if (!user) setShowSignupPrompt(true);
                    }}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Details
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => {
                      if (!user) setShowSignupPrompt(true);
                    }}>
                      <Target className="h-4 w-4 mr-2" />
                      Set Alert for Similar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click any alert to view details</p>
                </div>
              )}
            </div>
          </div>

          {/* Popular Searches */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium mb-2">Trending Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {loading ? (
                    ['Loading...'].map(trend => (
                      <Button 
                        key={trend} 
                        variant="ghost" 
                        size="sm" 
                        disabled
                        className="text-xs h-6"
                      >
                        {trend}
                      </Button>
                    ))
                  ) : (
                    // Generate trending searches from alert keywords
                    Array.from(new Set(
                      demoAlerts
                        .flatMap(alert => alert.keywords)
                        .slice(0, 4)
                    )).map(trend => (
                    <Button 
                      key={trend} 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSearch(trend)}
                      className="text-xs h-6"
                    >
                      {trend}
                    </Button>
                  )))}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Live Data
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signup Prompt Dialog */}
        <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Unlock Full Access
              </DialogTitle>
              <DialogDescription>
                You've been exploring our demo! Get unlimited access to all regulatory alerts, custom searches, and real-time notifications.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Demo Includes:</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• {demoAlerts.length} real alerts</li>
                    <li>• Basic filtering</li>
                    <li>• Read-only access</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Full Access:</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• 1000+ daily alerts</li>
                    <li>• Custom notifications</li>
                    <li>• Export & analytics</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link to="/auth">Start Free Trial</Link>
                </Button>
                <Button variant="outline" onClick={() => setShowSignupPrompt(false)}>
                  Continue Demo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
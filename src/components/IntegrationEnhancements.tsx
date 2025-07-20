import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock2 as Timeline,
  GitMerge,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Link,
  TrendingUp,
  Shield,
  Database
} from 'lucide-react';
import { fdaApi, FDAEnforcementResult } from '@/lib/fda-api';

interface TimelineEvent {
  id: string;
  type: 'fda_recall' | 'web_mention' | 'correlation';
  timestamp: Date;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  source: string;
  data: any;
  correlations?: string[];
}

interface IntegrationEnhancementsProps {
  searchQuery?: string;
}

export function IntegrationEnhancements({ searchQuery = "listeria" }: IntegrationEnhancementsProps) {
  const [loading, setLoading] = useState(false);
  const [fdaData, setFdaData] = useState<FDAEnforcementResult[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery) {
      fetchIntegratedData();
    }
  }, [searchQuery]);

  const fetchIntegratedData = async () => {
    setLoading(true);
    try {
      // Fetch FDA data
      const fdaResponse = await fdaApi.searchFoodEnforcement({
        search: searchQuery,
        limit: 10
      });

      setFdaData(fdaResponse.results);

      // Create timeline events from FDA data only
      const timelineEvents = createTimelineFromFDA(fdaResponse.results);
      setTimelineEvents(timelineEvents);

      toast({
        title: "Data Integration Complete",
        description: `Found ${fdaResponse.results.length} FDA enforcement records for analysis.`,
      });

    } catch (error) {
      console.error('Error fetching integrated data:', error);
      toast({
        title: "Integration Error",
        description: "Unable to fetch integrated regulatory data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTimelineFromFDA = (fdaResults: FDAEnforcementResult[]): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add FDA recall events
    fdaResults.forEach((recall, index) => {
      // Safely parse the date
      let timestamp: Date;
      try {
        if (recall.recall_initiation_date && recall.recall_initiation_date !== '') {
          timestamp = new Date(recall.recall_initiation_date);
          // Check if date is valid
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date(); // Fallback to current date
          }
        } else {
          timestamp = new Date(); // Fallback to current date
        }
      } catch (error) {
        timestamp = new Date(); // Fallback to current date
      }

      events.push({
        id: `fda-${index}`,
        type: 'fda_recall',
        timestamp,
        title: recall.reason_for_recall || 'FDA Enforcement Action',
        description: `${recall.product_description || 'Product'} - ${recall.company_name || 'Company'}`,
        severity: recall.classification === 'Class I' ? 'high' : 
                 recall.classification === 'Class II' ? 'medium' : 'low',
        source: 'FDA Enforcement Database',
        data: recall
      });
    });

    // Sort by timestamp
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'fda_recall': return Database;
      case 'web_mention': return Link;
      case 'correlation': return GitMerge;
      default: return Activity;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Regulatory Intelligence Integration</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Unified regulatory intelligence showing FDA enforcement data and regulatory timeline analysis
        </p>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Timeline className="h-4 w-4" />
            Timeline View
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analysis Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timeline className="h-5 w-5" />
                Regulatory Timeline
              </CardTitle>
              <CardDescription>
                Chronological view of FDA actions and regulatory events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading regulatory timeline...</p>
                </div>
              ) : timelineEvents.length > 0 ? (
                <div className="space-y-4">
                  {timelineEvents.map((event) => {
                    const EventIcon = getEventIcon(event.type);
                    return (
                      <div key={event.id} className="flex gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="p-2 rounded-full bg-primary/10">
                            <EventIcon className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant="outline" className={`text-xs ${getSeverityColor(event.severity)}`}>
                                {event.severity.toUpperCase()}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(event.timestamp)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {event.source}
                            </Badge>
                            {event.type === 'fda_recall' && event.data.recall_number && (
                              <Badge variant="outline" className="text-xs">
                                {event.data.recall_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Timeline Data</h3>
                  <p className="text-muted-foreground">
                    Start a search to see regulatory timeline events.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  FDA Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Records</span>
                    <Badge variant="secondary">{fdaData.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Class I Recalls</span>
                    <Badge variant="destructive">
                      {fdaData.filter(item => item.classification === 'Class I').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recent Actions</span>
                    <Badge variant="outline">
                      {fdaData.filter(item => {
                        const date = new Date(item.recall_initiation_date || '');
                        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        return date > thirtyDaysAgo;
                      }).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Risk Events</span>
                    <Badge variant="destructive">
                      {timelineEvents.filter(e => e.severity === 'high').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium Risk</span>
                    <Badge className="bg-orange-500">
                      {timelineEvents.filter(e => e.severity === 'medium').length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low Risk</span>
                    <Badge className="bg-green-500">
                      {timelineEvents.filter(e => e.severity === 'low').length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">FDA Integration</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Freshness</span>
                    <Badge variant="outline" className="text-xs">
                      Live
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Update</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Regulatory Intelligence Dashboard
              </CardTitle>
              <CardDescription>
                Real-time monitoring and analysis of regulatory enforcement actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Key Capabilities</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Real-time FDA enforcement monitoring</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Automated risk assessment</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Intelligent timeline analysis</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Compliance impact evaluation</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Data Sources</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-blue-500" />
                        <span>FDA Enforcement Reports Database</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-blue-500" />
                        <span>Regulatory Classification System</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-blue-500" />
                        <span>Real-time API Integration</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={fetchIntegratedData} 
                    disabled={loading}
                    className="w-full md:w-auto"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        Refreshing Data...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Refresh Analysis
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
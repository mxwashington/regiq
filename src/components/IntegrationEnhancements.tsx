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
  Rss,
  Database
} from 'lucide-react';
import { fdaApi, FDAEnforcementResult } from '@/lib/fda-api';

interface RSSFeedItem {
  title: string;
  pubDate: string;
  link: string;
  description: string;
  category?: string;
  source: string;
}

interface TimelineEvent {
  id: string;
  type: 'fda_recall' | 'rss_alert' | 'web_mention' | 'correlation';
  timestamp: Date;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  source: string;
  data: any;
  correlations?: string[];
}

interface CrossReference {
  fdaRecall: FDAEnforcementResult;
  rssItem: RSSFeedItem;
  confidenceScore: number;
  matchType: 'company' | 'product' | 'recall_number' | 'keyword';
  matchDetails: string[];
}

export function IntegrationEnhancements() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [crossReferences, setCrossReferences] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7days');

  const { toast } = useToast();

  useEffect(() => {
    loadIntegratedData();
  }, [selectedTimeRange]);

  const loadIntegratedData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = selectedTimeRange === '7days' ? 7 : selectedTimeRange === '30days' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch FDA data
      const fdaQuery = `recall_initiation_date:[${startDate.toISOString().split('T')[0]}+TO+${endDate.toISOString().split('T')[0]}]`;
      const fdaResults = await fdaApi.searchMultipleEndpoints(
        fdaQuery, 
        ['foodEnforcement', 'drugEnforcement', 'deviceEnforcement'], 
        100
      );

      // Simulate RSS feed data (in real implementation, this would come from RSS integration)
      const mockRSSItems: RSSFeedItem[] = generateMockRSSData(startDate, endDate);

      // Create unified timeline
      const timelineEvents = createUnifiedTimeline(fdaResults, mockRSSItems);
      setTimeline(timelineEvents);

      // Find cross-references
      const crossRefs = findCrossReferences(fdaResults, mockRSSItems);
      setCrossReferences(crossRefs);

      toast({
        title: "Integration Data Loaded",
        description: `Found ${timelineEvents.length} events and ${crossRefs.length} correlations`,
      });

    } catch (error) {
      console.error('Integration error:', error);
      toast({
        title: "Integration Error",
        description: "Failed to load integrated data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMockRSSData = (startDate: Date, endDate: Date): RSSFeedItem[] => {
    // Mock RSS feed items that would come from USDA FSIS and other sources
    return [
      {
        title: "FSIS Issues Public Health Alert for Listeria Contamination",
        pubDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        link: "https://www.fsis.usda.gov/news-events/news-press-releases",
        description: "FSIS is issuing a public health alert for ready-to-eat meat products that may be contaminated with Listeria monocytogenes.",
        category: "Food Safety",
        source: "USDA FSIS"
      },
      {
        title: "FDA Announces Voluntary Recall of Blood Pressure Medication",
        pubDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        link: "https://www.fda.gov/news-events/press-announcements",
        description: "Pharmaceutical company voluntarily recalls lots of blood pressure medication due to potential contamination.",
        category: "Drug Safety",
        source: "FDA Press Release"
      },
      {
        title: "Salmonella Outbreak Linked to Contaminated Produce",
        pubDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        link: "https://www.cdc.gov/salmonella/outbreaks",
        description: "CDC investigates multi-state Salmonella outbreak potentially linked to leafy greens.",
        category: "Outbreak Investigation",
        source: "CDC"
      }
    ];
  };

  const createUnifiedTimeline = (
    fdaResults: Array<{ endpoint: string; data: any }>,
    rssItems: RSSFeedItem[]
  ): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add FDA recall events
    fdaResults.forEach(result => {
      result.data.results.forEach((recall: any) => {
        events.push({
          id: `fda-${recall.recall_number || Math.random()}`,
          type: 'fda_recall',
          timestamp: new Date(recall.recall_initiation_date),
          title: `${recall.classification} Recall: ${recall.product_description?.substring(0, 60)}...`,
          description: recall.reason_for_recall || 'No reason specified',
          severity: recall.classification === 'Class I' ? 'high' : 
                   recall.classification === 'Class II' ? 'medium' : 'low',
          source: `FDA ${result.endpoint}`,
          data: recall
        });
      });
    });

    // Add RSS feed events
    rssItems.forEach((item, index) => {
      events.push({
        id: `rss-${index}`,
        type: 'rss_alert',
        timestamp: new Date(item.pubDate),
        title: item.title,
        description: item.description,
        severity: item.title.toLowerCase().includes('listeria') || 
                 item.title.toLowerCase().includes('class i') ? 'high' : 'medium',
        source: item.source,
        data: item
      });
    });

    // Sort by timestamp (newest first)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const findCrossReferences = (
    fdaResults: Array<{ endpoint: string; data: any }>,
    rssItems: RSSFeedItem[]
  ): CrossReference[] => {
    const crossRefs: CrossReference[] = [];

    fdaResults.forEach(result => {
      result.data.results.forEach((recall: any) => {
        rssItems.forEach(rssItem => {
          const matches = findMatches(recall, rssItem);
          if (matches.score > 0.3) { // Minimum confidence threshold
            crossRefs.push({
              fdaRecall: recall,
              rssItem,
              confidenceScore: matches.score,
              matchType: matches.type,
              matchDetails: matches.details
            });
          }
        });
      });
    });

    return crossRefs.sort((a, b) => b.confidenceScore - a.confidenceScore);
  };

  const findMatches = (recall: any, rssItem: RSSFeedItem) => {
    let score = 0;
    const details: string[] = [];
    let matchType: 'company' | 'product' | 'recall_number' | 'keyword' = 'keyword';

    // Check for company name matches
    if (recall.company_name && rssItem.title.toLowerCase().includes(recall.company_name.toLowerCase())) {
      score += 0.8;
      details.push(`Company match: ${recall.company_name}`);
      matchType = 'company';
    }

    // Check for recall number matches
    if (recall.recall_number && (rssItem.title.includes(recall.recall_number) || rssItem.description.includes(recall.recall_number))) {
      score += 0.9;
      details.push(`Recall number match: ${recall.recall_number}`);
      matchType = 'recall_number';
    }

    // Check for product matches
    const productKeywords = recall.product_description?.toLowerCase().split(' ') || [];
    productKeywords.forEach(keyword => {
      if (keyword.length > 4 && (rssItem.title.toLowerCase().includes(keyword) || rssItem.description.toLowerCase().includes(keyword))) {
        score += 0.2;
        details.push(`Product keyword: ${keyword}`);
        matchType = 'product';
      }
    });

    // Check for pathogen/contamination matches
    const contaminants = ['listeria', 'salmonella', 'e. coli', 'hepatitis', 'norovirus'];
    contaminants.forEach(contaminant => {
      if (recall.reason_for_recall?.toLowerCase().includes(contaminant) && 
          (rssItem.title.toLowerCase().includes(contaminant) || rssItem.description.toLowerCase().includes(contaminant))) {
        score += 0.6;
        details.push(`Contamination match: ${contaminant}`);
      }
    });

    // Check for timing correlation (within 3 days)
    const recallDate = new Date(recall.recall_initiation_date);
    const rssDate = new Date(rssItem.pubDate);
    const timeDiff = Math.abs(recallDate.getTime() - rssDate.getTime()) / (1000 * 60 * 60 * 24);
    if (timeDiff <= 3) {
      score += 0.3;
      details.push(`Timeline correlation: ${Math.round(timeDiff)} days apart`);
    }

    return { score: Math.min(score, 1.0), type: matchType, details };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'fda_recall': return Database;
      case 'rss_alert': return Rss;
      case 'web_mention': return ExternalLink;
      case 'correlation': return GitMerge;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitMerge className="h-5 w-5" />
            <span>Unified Regulatory Intelligence</span>
          </CardTitle>
          <CardDescription>
            Cross-platform integration showing correlations between FDA data, RSS feeds, and web intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button 
              variant={selectedTimeRange === '7days' ? 'default' : 'outline'}
              onClick={() => setSelectedTimeRange('7days')}
            >
              Last 7 days
            </Button>
            <Button 
              variant={selectedTimeRange === '30days' ? 'default' : 'outline'}
              onClick={() => setSelectedTimeRange('30days')}
            >
              Last 30 days
            </Button>
            <Button 
              variant={selectedTimeRange === '90days' ? 'default' : 'outline'}
              onClick={() => setSelectedTimeRange('90days')}
            >
              Last 90 days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Unified Timeline</TabsTrigger>
          <TabsTrigger value="correlations">Cross-References</TabsTrigger>
          <TabsTrigger value="notifications">Smart Notifications</TabsTrigger>
        </TabsList>

        {/* Unified Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timeline className="h-5 w-5" />
                <span>Regulatory Event Timeline</span>
              </CardTitle>
              <CardDescription>
                Chronological view of FDA actions, RSS alerts, and web intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {timeline.map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {React.createElement(getEventIcon(event.type), { 
                        className: `h-6 w-6 ${event.severity === 'high' ? 'text-red-500' : 
                                             event.severity === 'medium' ? 'text-orange-500' : 'text-green-500'}` 
                      })}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          <Badge variant="outline">
                            {event.source}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{event.timestamp.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Activity className="h-3 w-3" />
                          <span>{event.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      {event.correlations && event.correlations.length > 0 && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Link className="h-3 w-3 mr-1" />
                            {event.correlations.length} correlation(s)
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross-References */}
        <TabsContent value="correlations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Link className="h-5 w-5" />
                <span>FDA-RSS Cross-References</span>
              </CardTitle>
              <CardDescription>
                Automatic correlations between FDA database records and RSS feed alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {crossReferences.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No cross-references found for the selected time period
                  </p>
                ) : (
                  crossReferences.map((crossRef, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Cross-Reference Match</h4>
                        <Badge className={crossRef.confidenceScore > 0.7 ? 'bg-green-100 text-green-800' : 
                                         crossRef.confidenceScore > 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                                         'bg-blue-100 text-blue-800'}>
                          {Math.round(crossRef.confidenceScore * 100)}% confidence
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FDA Recall */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-sm">FDA Recall</span>
                          </div>
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-sm font-medium">{crossRef.fdaRecall.product_description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {crossRef.fdaRecall.company_name} - {crossRef.fdaRecall.classification}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Recall #{crossRef.fdaRecall.recall_number}
                            </p>
                          </div>
                        </div>

                        {/* RSS Alert */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Rss className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-sm">RSS Alert</span>
                          </div>
                          <div className="bg-orange-50 p-3 rounded">
                            <p className="text-sm font-medium">{crossRef.rssItem.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {crossRef.rssItem.source}
                            </p>
                            <a 
                              href={crossRef.rssItem.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center mt-1"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Source
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Match Details */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Match Details:</span>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            Type: {crossRef.matchType.replace('_', ' ')}
                          </Badge>
                          {crossRef.matchDetails.map((detail, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {detail}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Smart Notification System</span>
              </CardTitle>
              <CardDescription>
                Intelligent alerts when FDA database confirms RSS feed alerts or correlations are detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Confirmed Alerts</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {crossReferences.filter(cr => cr.confidenceScore > 0.7).length}
                    </div>
                    <p className="text-xs text-muted-foreground">High confidence matches</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <span className="font-medium">Pending Review</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {crossReferences.filter(cr => cr.confidenceScore >= 0.5 && cr.confidenceScore <= 0.7).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Medium confidence matches</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Total Events</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{timeline.length}</div>
                    <p className="text-xs text-muted-foreground">All regulatory events</p>
                  </Card>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Smart Notification Features</h4>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Automatic correlation detection between FDA and RSS data</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Real-time alerts when RSS feeds are confirmed by FDA actions</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Timeline analysis showing regulatory event patterns</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Confidence scoring for cross-platform matches</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
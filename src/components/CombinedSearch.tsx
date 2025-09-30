import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';
import { 
  Search, 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  ExternalLink,
  Clock,
  Shield,
  FileText,
  Building,
  MapPin,
  Zap,
  Globe,
  Database,
  TrendingUp
} from 'lucide-react';
import { fdaApi, FDAResponse } from '@/lib/fda-api';

interface PerplexityResult {
  content: string;
  citations: string[];
  related_questions: string[];
  urgency_score: number;
  agencies_mentioned: string[];
  search_type: string;
  query: string;
  timestamp: string;
  cached?: boolean;
}

interface CombinedResults {
  perplexity?: PerplexityResult;
  fda: Array<{ endpoint: string; data: FDAResponse<any>; error?: string }>;
  correlations: Array<{
    type: 'recall_mentioned' | 'company_match' | 'timeline_overlap';
    description: string;
    confidence: number;
  }>;
}

export function CombinedSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CombinedResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchScope, setSearchScope] = useState<'combined' | 'enforcement' | 'events'>('combined');

  const { session } = useAuth();
  const { toast } = useToast();
  const { getFeatureValue } = useEntitlements();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleCombinedSearch = async () => {
    if (!query.trim() || !session) {
      toast({
        title: "Search Error",
        description: "Please enter a search query and ensure you're signed in.",
        variant: "destructive"
      });
      return;
    }

    // Check if user has query access
    const queryLimit = getFeatureValue('queries_per_month') || 0;
    if (queryLimit === 0) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Run both searches in parallel
      const [perplexityPromise, fdaPromise] = await Promise.allSettled([
        // Perplexity search
        supabase.functions.invoke('perplexity-search', {
          body: {
            query,
            searchType: 'general'
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),

        // FDA search based on scope
        searchScope === 'combined' 
          ? fdaApi.searchMultipleEndpoints(query, ['foodEnforcement', 'drugEnforcement', 'deviceEnforcement', 'drugsFda'], 15)
          : searchScope === 'enforcement'
          ? fdaApi.searchMultipleEndpoints(query, ['foodEnforcement', 'drugEnforcement', 'deviceEnforcement'], 20)
          : fdaApi.searchMultipleEndpoints(query, ['foodEvent', 'drugEvent', 'animalEvent'], 20)
      ]);

      let perplexityResult: PerplexityResult | undefined;
      let fdaResults: Array<{ endpoint: string; data: FDAResponse<any>; error?: string }> = [];

      // Process Perplexity results
      if (perplexityPromise.status === 'fulfilled' && !perplexityPromise.value.error) {
        perplexityResult = perplexityPromise.value.data;
      }

      // Process FDA results
      if (fdaPromise.status === 'fulfilled') {
        fdaResults = fdaPromise.value;
      }

      // Find correlations between web intelligence and FDA data
      const correlations = findCorrelations(perplexityResult, fdaResults);

      const combinedResults: CombinedResults = {
        perplexity: perplexityResult,
        fda: fdaResults,
        correlations
      };

      setResults(combinedResults);

      const totalFDAResults = fdaResults.reduce((sum, r) => sum + r.data.results.length, 0);
      toast({
        title: "Combined Search Complete",
        description: `Found ${totalFDAResults} FDA records${perplexityResult ? ' and web intelligence' : ''}`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const findCorrelations = (
    perplexity: PerplexityResult | undefined, 
    fdaResults: Array<{ endpoint: string; data: FDAResponse<any>; error?: string }>
  ) => {
    const correlations: Array<{
      type: 'recall_mentioned' | 'company_match' | 'timeline_overlap';
      description: string;
      confidence: number;
    }> = [];

    if (!perplexity) return correlations;

    // Extract companies and products mentioned in Perplexity content
    const content = perplexity.content.toLowerCase();
    
    // Check for recall number mentions
    const recallPattern = /recall\s*#?\s*(\d{4}-\d+)/gi;
    const recallMatches = content.match(recallPattern);
    
    if (recallMatches) {
      correlations.push({
        type: 'recall_mentioned',
        description: `Web intelligence mentions specific recall numbers: ${recallMatches.join(', ')}`,
        confidence: 0.9
      });
    }

    // Check for company name matches
    fdaResults.forEach(result => {
      result.data.results.forEach((item: any) => {
        if (item.company_name && content.includes(item.company_name.toLowerCase())) {
          correlations.push({
            type: 'company_match',
            description: `Company "${item.company_name}" appears in both web intelligence and FDA records`,
            confidence: 0.8
          });
        }
      });
    });

    // Check for timeline overlaps (events mentioned in news around the same time as FDA actions)
    const recentMentions = content.includes('recent') || content.includes('latest') || content.includes('new');
    const recentFDAActions = fdaResults.some(result => 
      result.data.results.some((item: any) => {
        if (item.recall_initiation_date) {
          const recallDate = new Date(item.recall_initiation_date);
          const daysSince = (Date.now() - recallDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30;
        }
        return false;
      })
    );

    if (recentMentions && recentFDAActions) {
      correlations.push({
        type: 'timeline_overlap',
        description: 'Web intelligence mentions recent events that align with recent FDA actions',
        confidence: 0.7
      });
    }

    return correlations;
  };

  const getCorrelationIcon = (type: string) => {
    switch (type) {
      case 'recall_mentioned': return FileText;
      case 'company_match': return Building;
      case 'timeline_overlap': return Calendar;
      default: return TrendingUp;
    }
  };

  const getCorrelationColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Class I': return 'bg-red-100 text-red-800 border-red-200';
      case 'Class II': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Class III': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Hybrid Intelligence Search</span>
          </CardTitle>
          <CardDescription>
            Combine real-time web intelligence with official FDA database records for comprehensive regulatory insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="combined-query">Search Query</Label>
            <Input
              id="combined-query"
              placeholder="e.g., salmonella outbreak, listeria recall, drug shortage metformin"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCombinedSearch()}
            />
          </div>

          <div className="space-y-2">
            <Label>FDA Data Scope</Label>
            <Tabs value={searchScope} onValueChange={(value) => setSearchScope(value as any)}>
              <TabsList className="flex flex-col w-full h-auto md:grid md:grid-cols-3 md:h-10">
                <TabsTrigger value="combined" className="w-full justify-start md:justify-center">All Data</TabsTrigger>
                <TabsTrigger value="enforcement" className="w-full justify-start md:justify-center">Enforcement Only</TabsTrigger>
                <TabsTrigger value="events" className="w-full justify-start md:justify-center">Events Only</TabsTrigger>
              </TabsList>

              <TabsContent value="combined" className="text-sm text-muted-foreground">
                Search enforcement actions, recalls, adverse events, and drug shortages
              </TabsContent>
              <TabsContent value="enforcement" className="text-sm text-muted-foreground">
                Focus on recalls and enforcement actions
              </TabsContent>
              <TabsContent value="events" className="text-sm text-muted-foreground">
                Focus on adverse events and safety reports
              </TabsContent>
            </Tabs>
          </div>

          <Button 
            onClick={handleCombinedSearch} 
            disabled={loading || !query.trim()}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            Run Hybrid Search
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Search Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Combined Results */}
      {results && (
        <div className="space-y-6">
          {/* Correlations */}
          {results.correlations.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <TrendingUp className="h-5 w-5" />
                  <span>Intelligence Correlations</span>
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Connections found between web intelligence and FDA data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.correlations.map((correlation, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      {React.createElement(getCorrelationIcon(correlation.type), { 
                        className: "h-4 w-4 text-blue-600 flex-shrink-0" 
                      })}
                      <span className="text-sm text-blue-800 flex-grow">
                        {correlation.description}
                      </span>
                      <Badge className={getCorrelationColor(correlation.confidence)}>
                        {Math.round(correlation.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Web Intelligence Results */}
            {results.perplexity && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Web Intelligence</span>
                    {results.perplexity.cached && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Cached
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Real-time regulatory intelligence from web sources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      Urgency: {results.perplexity.urgency_score}/10
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(results.perplexity.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {results.perplexity.agencies_mentioned.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Agencies Mentioned</h4>
                      <div className="flex flex-wrap gap-2">
                        {results.perplexity.agencies_mentioned.map((agency) => (
                          <Badge key={agency} variant="outline">
                            <Shield className="w-3 h-3 mr-1" />
                            {agency}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {results.perplexity.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {results.perplexity.citations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sources</h4>
                      <div className="space-y-1">
                        {results.perplexity.citations.slice(0, 3).map((citation, index) => (
                          <a
                            key={index}
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-blue-600 hover:underline text-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">{citation}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* FDA Database Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>FDA Official Records</span>
                  <Badge variant="outline">
                    {results.fda.reduce((sum, r) => sum + r.data.results.length, 0)} records
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Official FDA enforcement actions and regulatory data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {results.fda.map((fdaResult, index) => {
                    if (fdaResult.data.results.length === 0) return null;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center space-x-2">
                          <Shield className="w-4 h-4" />
                          <span>{fdaResult.endpoint.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <Badge variant="outline" className="text-xs">
                            {fdaResult.data.results.length}
                          </Badge>
                        </h4>
                        
                        {fdaResult.data.results.slice(0, 3).map((item: any, itemIndex: number) => (
                          <div key={itemIndex} className="border rounded p-3 space-y-2 bg-gray-50">
                            {item.recall_number && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Badge className={getClassificationColor(item.classification)}>
                                    {item.classification}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    #{item.recall_number}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">{item.product_description}</p>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <Building className="w-3 h-3" />
                                    <span>{item.company_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(item.recall_initiation_date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{item.city}, {item.state}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  <strong>Reason:</strong> {item.reason_for_recall?.substring(0, 100)}...
                                </p>
                              </div>
                            )}

                            {item.product_name && fdaResult.endpoint === 'drugShortages' && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{item.product_name}</p>
                                <Badge variant="outline">{item.status}</Badge>
                                <p className="text-xs text-muted-foreground">
                                  <strong>Reason:</strong> {item.reason}
                                </p>
                              </div>
                            )}

                            {item.safetyreportid && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Report #{item.safetyreportid}</p>
                                {item.serious && (
                                  <Badge variant="destructive" className="text-xs">Serious Event</Badge>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Country: {item.occurcountry || item.primarysourcecountry}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Upgrade Paywall */}
      <FeaturePaywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="search_queries"
        context="You need a paid plan to use search queries. Starter Plan only includes alerts, not search functionality."
      />
    </div>
  );
}
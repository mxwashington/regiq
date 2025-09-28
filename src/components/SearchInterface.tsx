import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, AlertTriangle, Calendar, ExternalLink, FileText, Shield, Globe, Database, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';
import { fdaApi, FDAResponse } from '@/lib/fda-api';
import { logger } from '@/lib/logger';

interface SearchResult {
  content?: string;
  response?: string;
  sources?: Array<{ title: string; url: string }>;
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
  ai?: SearchResult;
  fda: Array<{ endpoint: string; data: FDAResponse<any>; error?: string }>;
  correlations: Array<{
    type: 'recall_mentioned' | 'company_match' | 'timeline_overlap';
    description: string;
    confidence: number;
  }>;
}

interface SearchInterfaceProps {
  alerts: any[];
  onSaveAlert: (alertId: string) => void;
  savedAlerts: any[];
}

export function SearchInterface({ alerts, onSaveAlert, savedAlerts }: SearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'ai' | 'combined'>('ai');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CombinedResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { session } = useAuth();
  const { toast } = useToast();
  const { getFeatureValue } = useEntitlements();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleAISearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Error",
        description: "Please enter a search query.",
        variant: "destructive"
      });
      return;
    }

    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use AI search.",
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
      if (searchType === 'ai') {
        // AI-only search using Perplexity
        const { data, error: searchError } = await supabase.functions.invoke('perplexity-search', {
          body: {
            query: searchQuery,
            searchType: 'general'
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (searchError) throw searchError;

        setResults({
          ai: data,
          fda: [],
          correlations: []
        });

        toast({
          title: "AI Search Complete",
          description: `Found regulatory intelligence${data.cached ? ' (cached result)' : ''}`,
        });

      } else {
        // Combined AI + FDA search
        const [aiPromise, fdaPromise] = await Promise.allSettled([
          supabase.functions.invoke('perplexity-search', {
            body: {
              query: searchQuery,
              searchType: 'general'
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }),
          fdaApi.searchMultipleEndpoints(searchQuery, ['foodEnforcement', 'drugEnforcement', 'deviceEnforcement'], 10)
        ]);

        let aiResult: SearchResult | undefined;
        let fdaResults: Array<{ endpoint: string; data: FDAResponse<any>; error?: string }> = [];

        if (aiPromise.status === 'fulfilled' && !aiPromise.value.error) {
          aiResult = aiPromise.value.data;
        }

        if (fdaPromise.status === 'fulfilled') {
          fdaResults = fdaPromise.value;
        }

        // Find correlations
        const correlations = findCorrelations(aiResult, fdaResults);

        setResults({
          ai: aiResult,
          fda: fdaResults,
          correlations
        });

        const totalFDAResults = fdaResults.reduce((sum, r) => sum + r.data.results.length, 0);
        toast({
          title: "Combined Search Complete",
          description: `Found ${totalFDAResults} FDA records${aiResult ? ' and AI intelligence' : ''}`,
        });
      }

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
    ai: SearchResult | undefined, 
    fdaResults: Array<{ endpoint: string; data: FDAResponse<any>; error?: string }>
  ) => {
    const correlations: Array<{
      type: 'recall_mentioned' | 'company_match' | 'timeline_overlap';
      description: string;
      confidence: number;
    }> = [];

    if (!ai) return correlations;

    const content = (ai.content || ai.response || '').toLowerCase();
    
    // Check for recall mentions
    const recallPattern = /recall\s*#?\s*(\d{4}-\d+)/gi;
    const recallMatches = content.match(recallPattern);
    
    if (recallMatches) {
      correlations.push({
        type: 'recall_mentioned',
        description: `AI intelligence mentions specific recall numbers: ${recallMatches.join(', ')}`,
        confidence: 0.9
      });
    }

    // Check for company matches
    fdaResults.forEach(result => {
      result.data.results.forEach((item: any) => {
        if (item.company_name && content.includes(item.company_name.toLowerCase())) {
          correlations.push({
            type: 'company_match',
            description: `Company "${item.company_name}" appears in both AI intelligence and FDA records`,
            confidence: 0.8
          });
        }
      });
    });

    return correlations;
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>AI Regulatory Search</span>
          </CardTitle>
          <CardDescription>
            Search for real-time regulatory intelligence using AI and official government databases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchType} onValueChange={(value) => setSearchType(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                AI Intelligence
              </TabsTrigger>
              <TabsTrigger value="combined" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI + FDA Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="e.g., FDA food safety updates, E. coli contamination, drug recalls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                />
                <p className="text-sm text-muted-foreground">
                  Search real-time regulatory intelligence from web sources
                </p>
              </div>
            </TabsContent>

            <TabsContent value="combined" className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="e.g., listeria recall, salmonella outbreak, drug shortage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                />
                <p className="text-sm text-muted-foreground">
                  Combine AI intelligence with official FDA enforcement records
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            onClick={handleAISearch} 
            disabled={loading || !searchQuery.trim()}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            {searchType === 'ai' ? 'Search AI Intelligence' : 'Search AI + FDA Data'}
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

      {/* Search Results */}
      {results && (
        <div className="space-y-6">
          {/* Correlations */}
          {results.correlations.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <FileText className="h-5 w-5" />
                  <span>Intelligence Correlations</span>
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Connections found between AI intelligence and FDA data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.correlations.map((correlation, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-blue-800 flex-grow">
                        {correlation.description}
                      </span>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        {Math.round(correlation.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Results */}
            {results.ai && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>AI Regulatory Intelligence</span>
                    {results.ai.cached && (
                      <Badge variant="outline" className="text-xs">
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
                      Urgency: {results.ai.urgency_score}/10
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(results.ai.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {results.ai.agencies_mentioned.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Agencies Mentioned</h4>
                      <div className="flex flex-wrap gap-2">
                        {results.ai.agencies_mentioned.map((agency) => (
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
                        {results.ai.content || results.ai.response || ''}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {results.ai.sources && results.ai.sources.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sources</h4>
                      <div className="space-y-2">
                        {results.ai.sources.slice(0, 3).map((source, index) => (
                          <a
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-blue-600 hover:underline text-sm p-2 bg-blue-50 rounded border"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="font-medium">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* FDA Results */}
            {results.fda.length > 0 && (
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
                                    <Badge className="bg-red-100 text-red-800 border-red-200">
                                      {item.classification || 'N/A'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {item.recall_number}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium">{item.product_description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Company: {item.recalling_firm}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Reason: {item.reason_for_recall}
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
            )}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !results && !error && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Search Regulatory Intelligence</p>
          <p className="text-muted-foreground">Enter a query to search for real-time regulatory information</p>
        </div>
      )}

      {/* Feature Paywall */}
      {showPaywall && (
        <FeaturePaywall
          feature="search_queries"
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}
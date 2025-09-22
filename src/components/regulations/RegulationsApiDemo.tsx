import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  FileText, 
  MessageSquare, 
  Building2, 
  Calendar,
  ExternalLink,
  Code,
  Database,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { regulationsService } from '@/lib/regulations/regulationsService';
import { INDUSTRY_PRESETS } from '@/lib/regulations/types';

export const RegulationsApiDemo: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('food safety recall');
  const [documentId, setDocumentId] = useState('');
  const [docketId, setDocketId] = useState('');

  // Demo function implementations
  const demoSearchDocuments = async () => {
    setLoading(true);
    try {
      const result = await regulationsService.searchDocuments(searchTerm, {
        agencyId: ['FDA', 'FSIS'],
        documentType: ['Rule', 'Notice']
      }, { size: 10 });
      
      setResults({
        type: 'search',
        data: result,
        description: `Search for "${searchTerm}" in FDA and FSIS documents`
      });
      
      toast({
        title: "Search Complete",
        description: `Found ${result.data.length} documents`,
      });
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const demoGetDocumentDetails = async () => {
    if (!documentId.trim()) {
      toast({
        title: "Document ID Required",
        description: "Please enter a document ID to fetch details",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await regulationsService.getDocumentDetails(documentId);
      
      setResults({
        type: 'document',
        data: result,
        description: `Document details for ${documentId}`
      });
      
      toast({
        title: "Document Loaded",
        description: "Document details retrieved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load document details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const demoSearchByAgencies = async () => {
    setLoading(true);
    try {
      const result = await regulationsService.searchByAgencies(
        ['FDA', 'EPA', 'USDA'], 
        'regulation compliance',
        { size: 15 }
      );
      
      setResults({
        type: 'agencies',
        data: result,
        description: 'Documents from FDA, EPA, and USDA containing "regulation compliance"'
      });
      
      toast({
        title: "Agency Search Complete",
        description: `Found ${result.data.length} documents from selected agencies`,
      });
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search by agencies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const demoGetRecentDocuments = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const result = await regulationsService.getRecentDocuments(
        { startDate },
        ['FDA', 'FSIS'],
        { size: 12 }
      );
      
      setResults({
        type: 'recent',
        data: result,
        description: 'Recent documents from FDA and FSIS (last 30 days)'
      });
      
      toast({
        title: "Recent Documents Loaded",
        description: `Found ${result.data.length} recent documents`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load recent documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const demoSearchComments = async () => {
    if (!docketId.trim()) {
      toast({
        title: "Docket ID Required",
        description: "Please enter a docket ID to search comments",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await regulationsService.searchComments(docketId, { size: 10 });
      
      setResults({
        type: 'comments',
        data: result,
        description: `Public comments for docket ${docketId}`
      });
      
      toast({
        title: "Comments Loaded",
        description: `Found ${result.data.length} comments`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const demoGetProcessedDocuments = async () => {
    setLoading(true);
    try {
      const result = await regulationsService.getProcessedDocuments(
        'FOOD_BEVERAGE',
        'safety inspection',
        { size: 10 }
      );
      
      setResults({
        type: 'processed',
        data: result,
        description: 'AI-processed food & beverage documents with urgency scoring'
      });
      
      toast({
        title: "Processed Documents Loaded",
        description: `Loaded ${result.length} processed documents with AI analysis`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load processed documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const demoRegulatoryIntelligence = async () => {
    setLoading(true);
    try {
      const result = await regulationsService.getRegulatoryIntelligence(
        'PHARMACEUTICALS',
        { days: 7 }
      );
      
      setResults({
        type: 'intelligence',
        data: result,
        description: 'Pharmaceutical industry regulatory intelligence (last 7 days)'
      });
      
      toast({
        title: "Intelligence Report Generated",
        description: `Analysis of ${result.totalDocuments} documents complete`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate intelligence report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Regulations.gov API Integration Demo</h1>
        <p className="text-muted-foreground">
          Explore our comprehensive API integration with live examples and real data
        </p>
      </div>

      <Tabs defaultValue="functions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="functions">API Functions</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="functions" className="space-y-6">
          {/* Core Functions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Core API Functions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Documents */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">1. Search Documents</h4>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Enter search term (e.g., 'food safety recall')"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={demoSearchDocuments} disabled={loading}>
                    Search
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Search regulatory documents with filters for agencies, document types, and date ranges.
                </p>
              </div>

              {/* Get Document Details */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">2. Get Document Details</h4>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Enter document ID (e.g., FDA-2023-N-1234)"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={demoGetDocumentDetails} disabled={loading}>
                    Get Details
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Retrieve detailed information for a specific regulatory document.
                </p>
              </div>

              {/* Search by Agencies */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">3. Search by Agencies</h4>
                <Button onClick={demoSearchByAgencies} disabled={loading} className="mb-3">
                  Search FDA, EPA & USDA
                </Button>
                <p className="text-sm text-muted-foreground">
                  Filter documents by specific regulatory agencies with industry-relevant keywords.
                </p>
              </div>

              {/* Get Recent Documents */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">4. Get Recent Documents</h4>
                <Button onClick={demoGetRecentDocuments} disabled={loading} className="mb-3">
                  Load Recent (30 days)
                </Button>
                <p className="text-sm text-muted-foreground">
                  Monitor new regulations and updates within specified date ranges.
                </p>
              </div>

              {/* Search Comments */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">5. Search Comments</h4>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Enter docket ID (e.g., FDA-2023-N-1234)"
                    value={docketId}
                    onChange={(e) => setDocketId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={demoSearchComments} disabled={loading}>
                    Get Comments
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Analyze public comments for stakeholder intelligence and sentiment analysis.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Industry-Specific Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Industry-Specific Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">AI-Processed Documents</h4>
                <Button onClick={demoGetProcessedDocuments} disabled={loading} className="mb-3">
                  Get Food & Beverage Analysis
                </Button>
                <p className="text-sm text-muted-foreground">
                  Enhanced documents with AI-powered urgency scoring, categorization, and industry relevance analysis.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.keys(INDUSTRY_PRESETS).map(key => (
                    <Badge key={key} variant="outline">
                      {INDUSTRY_PRESETS[key as keyof typeof INDUSTRY_PRESETS].name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Regulatory Intelligence</h4>
                <Button onClick={demoRegulatoryIntelligence} disabled={loading} className="mb-3">
                  Generate Pharma Intelligence
                </Button>
                <p className="text-sm text-muted-foreground">
                  Comprehensive industry reports with trends, urgent items, and comment period analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {results ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  API Response: {results.type}
                </CardTitle>
                <p className="text-muted-foreground">{results.description}</p>
              </CardHeader>
              <CardContent>
                {results.type === 'processed' ? (
                  <div className="space-y-4">
                    {results.data.map((doc: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{doc.agency}</Badge>
                              <Badge className={
                                doc.urgencyLevel === 'Critical' ? 'bg-destructive' :
                                doc.urgencyLevel === 'High' ? 'bg-orange-500' :
                                doc.urgencyLevel === 'Medium' ? 'bg-yellow-500' : 'bg-muted'
                              }>
                                {doc.urgencyLevel} ({doc.urgencyScore}/15)
                              </Badge>
                            </div>
                            <h4 className="font-medium mb-1">{doc.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{doc.summary}</p>
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.slice(0, 5).map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {doc.publishedDate ? new Date(doc.publishedDate).toLocaleDateString() : 'Unknown date'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.type === 'intelligence' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{results.data.totalDocuments}</div>
                        <div className="text-sm text-muted-foreground">Total Documents</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{results.data.urgentItems.length}</div>
                        <div className="text-sm text-muted-foreground">Urgent Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{results.data.openComments.length}</div>
                        <div className="text-sm text-muted-foreground">Open Comments</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{Object.keys(results.data.byAgency).length}</div>
                        <div className="text-sm text-muted-foreground">Agencies</div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Raw JSON Response</h4>
                      <Textarea 
                        value={formatJson(results.data)} 
                        readOnly 
                        className="h-64 font-mono text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium mb-3">Raw JSON Response</h4>
                    <Textarea 
                      value={formatJson(results.data)} 
                      readOnly 
                      className="h-96 font-mono text-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Results Yet</h3>
                <p className="text-muted-foreground">
                  Try one of the API functions to see live results from Regulations.gov
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Integration Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">API Configuration</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm">
{`// Environment Configuration
REGULATIONS_API_KEY=your_api_key_here

// Service Initialization
import { regulationsService } from '@/lib/regulations/regulationsService';

// Basic Usage
const results = await regulationsService.searchDocuments(
  'food safety', 
  { agencyId: ['FDA'] }, 
  { size: 25 }
);`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Key Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-2">Intelligent Caching</h5>
                    <p className="text-sm text-muted-foreground">
                      Automatic response caching with configurable TTL to optimize API usage and improve performance.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-2">Rate Limiting</h5>
                    <p className="text-sm text-muted-foreground">
                      Built-in rate limiting (1,000 requests/hour) with retry logic and circuit breaker patterns.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-2">AI Enhancement</h5>
                    <p className="text-sm text-muted-foreground">
                      AI-powered urgency scoring, categorization, and industry relevance analysis for all documents.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-2">Industry Presets</h5>
                    <p className="text-sm text-muted-foreground">
                      Pre-configured filters for Food & Beverage, Pharmaceuticals, Agriculture, and Environmental sectors.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">API Endpoints Implemented</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code className="text-sm">/documents</code>
                    <span className="text-sm text-muted-foreground">- Document search with filters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code className="text-sm">/documents/{'{documentId}'}</code>
                    <span className="text-sm text-muted-foreground">- Document details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code className="text-sm">/comments</code>
                    <span className="text-sm text-muted-foreground">- Public comments search</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code className="text-sm">/dockets</code>
                    <span className="text-sm text-muted-foreground">- Regulatory dockets</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Error Handling & Security</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Comprehensive error handling for rate limits and API failures</li>
                  <li>• API key secured via Supabase edge functions</li>
                  <li>• Request/response validation with TypeScript interfaces</li>
                  <li>• Automatic retry logic with exponential backoff</li>
                  <li>• Circuit breaker pattern for API resilience</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Ready for Production</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This integration is production-ready with proper error handling, caching, rate limiting, and security measures. 
                  Perfect for B2B regulatory intelligence applications requiring real-time government data monitoring.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
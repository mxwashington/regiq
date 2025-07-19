import React, { useState } from 'react';
import { Globe, AlertTriangle, CheckCircle, Clock, ExternalLink, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScrapingResult {
  target_id: string;
  success: boolean;
  data?: any[];
  error?: string;
  items_found: number;
  legal_compliance_logged: boolean;
}

interface ScrapingResponse {
  success: boolean;
  total_targets: number;
  successful_scrapes: number;
  failed_scrapes: number;
  total_items: number;
  results: ScrapingResult[];
  compliance_logged: boolean;
  timestamp: string;
}

const SCRAPING_TARGETS = [
  {
    id: 'all',
    name: 'All Government Sources',
    agency: 'All',
    description: 'Scrape all available government websites'
  },
  {
    id: 'fda-enforcement-reports',
    name: 'FDA Enforcement Reports',
    agency: 'FDA',
    description: 'FDA enforcement actions and safety alerts'
  },
  {
    id: 'usda-recalls',
    name: 'USDA Food Safety Recalls',
    agency: 'USDA',
    description: 'USDA food safety recalls and alerts'
  },
  {
    id: 'epa-enforcement',
    name: 'EPA Enforcement Actions',
    agency: 'EPA',
    description: 'EPA environmental enforcement actions'
  }
];

const AGENCIES = [
  { value: '', label: 'All Agencies' },
  { value: 'FDA', label: 'FDA - Food and Drug Administration' },
  { value: 'USDA', label: 'USDA - Department of Agriculture' },
  { value: 'EPA', label: 'EPA - Environmental Protection Agency' }
];

export default function GovernmentWebScraper() {
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleScraping = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (selectedTarget && selectedTarget !== 'all') {
        searchParams.append('target', selectedTarget);
      }
      
      if (selectedAgency) {
        searchParams.append('agency', selectedAgency);
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        `government-web-scraper?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      const response: ScrapingResponse = data;

      if (!response.success) {
        throw new Error('Scraping failed');
      }

      setResults(response);

      toast({
        title: "Scraping Completed",
        description: `Scraped ${response.total_items} items from ${response.successful_scrapes}/${response.total_targets} sources`,
      });

    } catch (err: any) {
      console.error('Government scraping error:', err);
      setError(err.message);
      toast({
        title: "Scraping Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  const getAgencyBadgeColor = (agency: string) => {
    const agencyLower = agency.toLowerCase();
    if (agencyLower.includes('fda')) return 'bg-red-100 text-red-800';
    if (agencyLower.includes('usda')) return 'bg-green-100 text-green-800';
    if (agencyLower.includes('epa')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Government Web Scraper
          </CardTitle>
          <CardDescription>
            Legally compliant scraping of public government websites for regulatory information
          </CardDescription>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All scraping activities are logged for legal compliance and follow robots.txt guidelines. 
              Only public information is accessed.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Target Source</label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scraping target" />
                </SelectTrigger>
                <SelectContent>
                  {SCRAPING_TARGETS.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      <div>
                        <div className="font-medium">{target.name}</div>
                        <div className="text-xs text-muted-foreground">{target.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Agency Filter</label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by agency" />
                </SelectTrigger>
                <SelectContent>
                  {AGENCIES.map((agency) => (
                    <SelectItem key={agency.value} value={agency.value}>
                      {agency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleScraping} 
            disabled={loading}
            className="w-full flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            {loading ? 'Scraping...' : 'Start Scraping'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Scraping government websites...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scraping Results</span>
              <div className="flex items-center gap-2">
                {results.compliance_logged && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Compliance Logged
                  </Badge>
                )}
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(results.timestamp).toLocaleString()}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Successfully scraped {results.successful_scrapes} out of {results.total_targets} targets, 
              finding {results.total_items} total items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <h4 className="font-medium">
                        {SCRAPING_TARGETS.find(t => t.id === result.target_id)?.name || result.target_id}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getAgencyBadgeColor(
                        SCRAPING_TARGETS.find(t => t.id === result.target_id)?.agency || ''
                      )}>
                        {SCRAPING_TARGETS.find(t => t.id === result.target_id)?.agency}
                      </Badge>
                      {result.legal_compliance_logged && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-2 w-2 mr-1" />
                          Logged
                        </Badge>
                      )}
                    </div>
                  </div>

                  {result.success ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Found {result.items_found} items
                      </p>
                      {result.data && result.data.length > 0 && (
                        <div className="space-y-2">
                          {result.data.slice(0, 3).map((item, itemIndex) => (
                            <div key={itemIndex} className="bg-muted p-3 rounded text-sm">
                              <div className="font-medium">{item.title}</div>
                              {item.date && (
                                <div className="text-xs text-muted-foreground">
                                  {new Date(item.scraped_at).toLocaleDateString()}
                                </div>
                              )}
                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-xs flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Source
                                </a>
                              )}
                            </div>
                          ))}
                          {result.data.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              ... and {result.data.length - 3} more items
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-red-600">
                        Error: {result.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
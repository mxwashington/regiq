import React, { useState } from 'react';
import { Search, Database, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DataGovResult {
  title: string;
  description: string;
  agency: string;
  dataset_id?: string;
  modified: string;
  webService?: string;
  landingPage?: string;
  accessURL?: string;
}

interface DataGovResponse {
  success: boolean;
  count: number;
  results: DataGovResult[];
  error?: string;
  cached?: boolean;
  rate_limit_remaining?: number;
}

const GOVERNMENT_AGENCIES = [
  { value: '', label: 'All Agencies' },
  { value: 'department-of-agriculture', label: 'USDA - Department of Agriculture' },
  { value: 'food-and-drug-administration', label: 'FDA - Food and Drug Administration' },
  { value: 'environmental-protection-agency', label: 'EPA - Environmental Protection Agency' },
  { value: 'department-of-justice', label: 'DOJ - Department of Justice' },
  { value: 'department-of-health-and-human-services', label: 'HHS - Health and Human Services' },
  { value: 'centers-for-disease-control-and-prevention', label: 'CDC - Centers for Disease Control' },
  { value: 'occupational-safety-and-health-administration', label: 'OSHA - Occupational Safety and Health' }
];

export default function DataGovSearch() {
  const [query, setQuery] = useState('');
  const [agency, setAgency] = useState('');
  const [results, setResults] = useState<DataGovResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const searchParams = new URLSearchParams({
        query: query.trim(),
        limit: '20'
      });
      
      if (agency) {
        searchParams.append('agency', agency);
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        `data-gov-search?${searchParams.toString()}`,
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

      const response: DataGovResponse = data;

      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }

      setResults(response.results || []);
      setCached(response.cached || false);
      setRateLimitInfo({
        remaining: response.rate_limit_remaining,
        total: 1000 // Adjust based on your plan
      });

      toast({
        title: "Search Completed",
        description: `Found ${response.count} results${response.cached ? ' (cached)' : ''}`,
      });

    } catch (err: any) {
      console.error('Data.gov search error:', err);
      setError(err.message);
      toast({
        title: "Search Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getAgencyBadgeColor = (agency: string) => {
    const agencyLower = agency.toLowerCase();
    if (agencyLower.includes('fda')) return 'bg-red-100 text-red-800';
    if (agencyLower.includes('usda')) return 'bg-green-100 text-green-800';
    if (agencyLower.includes('epa')) return 'bg-blue-100 text-blue-800';
    if (agencyLower.includes('doj')) return 'bg-purple-100 text-purple-800';
    if (agencyLower.includes('cdc')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data.gov Search
          </CardTitle>
          <CardDescription>
            Search government datasets and find regulatory information from federal agencies
          </CardDescription>
          {rateLimitInfo && (
            <div className="text-sm text-muted-foreground">
              API Requests Remaining: {rateLimitInfo.remaining} / {rateLimitInfo.total}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search for datasets, regulations, or specific topics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-80">
              <Select value={agency} onValueChange={setAgency}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Agency" />
                </SelectTrigger>
                <SelectContent>
                  {GOVERNMENT_AGENCIES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          {cached && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                These results are cached and may be up to 1 hour old.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
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
              <span className="ml-2">Searching Data.gov...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Search Results ({results.length})
            </h3>
          </div>

          <div className="grid gap-4">
            {results.map((result, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-lg leading-tight">
                        {result.title}
                      </h4>
                      <Badge className={getAgencyBadgeColor(result.agency || '')}>
                        {result.agency}
                      </Badge>
                    </div>

                    {result.description && (
                      <p className="text-muted-foreground">
                        {result.description.length > 300 
                          ? `${result.description.substring(0, 300)}...`
                          : result.description
                        }
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {result.modified && (
                        <span>Modified: {formatDate(result.modified)}</span>
                      )}
                      {result.dataset_id && (
                        <span>ID: {result.dataset_id}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {result.landingPage && (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={result.landingPage} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Dataset
                          </a>
                        </Button>
                      )}
                      {result.accessURL && (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={result.accessURL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <Database className="h-3 w-3" />
                            Access Data
                          </a>
                        </Button>
                      )}
                      {result.webService && (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={result.webService} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            API
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
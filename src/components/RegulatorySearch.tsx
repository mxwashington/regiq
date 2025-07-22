import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  ExternalLink,
  Clock,
  Shield,
  FileText,
  Target
} from 'lucide-react';

interface SearchResult {
  content: string;
  citations: string[];
  related_questions: string[];
  urgency_score: number;
  agencies_mentioned: string[];
  search_type: string;
  query: string;
  timestamp: string;
  cached?: boolean;
  cached_at?: string;
}

interface SearchFilters {
  agencies: string[];
  industry: string;
  timeRange: string;
  searchType: string;
}

export function RegulatorySearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    agencies: [],
    industry: '',
    timeRange: 'month',
    searchType: 'general'
  });
  const [usageInfo, setUsageInfo] = useState<{
    current_usage: number;
    daily_limit: number;
    tier: string;
  } | null>(null);

  const { session } = useAuth();
  const { toast } = useToast();

  const agencies = [
    { id: 'FDA', name: 'FDA - Food and Drug Administration' },
    { id: 'USDA', name: 'USDA - Department of Agriculture' },
    { id: 'EPA', name: 'EPA - Environmental Protection Agency' },
    { id: 'FSIS', name: 'FSIS - Food Safety Inspection Service' },
    { id: 'CDC', name: 'CDC - Centers for Disease Control' }
  ];

  const industries = [
    'Food Safety',
    'Pharmaceuticals',
    'Agriculture', 
    'Water Treatment',
    'Chemical Manufacturing',
    'Medical Devices',
    'Cosmetics',
    'Dietary Supplements'
  ];

  const handleAgencyChange = (agencyId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      agencies: checked 
        ? [...prev.agencies, agencyId]
        : prev.agencies.filter(id => id !== agencyId)
    }));
  };

  const handleSearch = async () => {
    if (!query.trim() || !session) {
      toast({
        title: "Search Error",
        description: "Please enter a search query and ensure you're signed in.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: searchError } = await supabase.functions.invoke('perplexity-search', {
        body: {
          query,
          agencies: filters.agencies,
          industry: filters.industry || undefined,
          timeRange: filters.timeRange,
          searchType: filters.searchType
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (searchError) {
        if (searchError.message?.includes('limit reached')) {
          setUsageInfo({
            current_usage: data?.current_usage || 0,
            daily_limit: data?.daily_limit || 0,
            tier: 'free'
          });
          setError(`Daily search limit reached. Upgrade your plan for more searches.`);
        } else {
          throw searchError;
        }
        return;
      }

      setResults(data);
      toast({
        title: "Search Complete",
        description: `Found regulatory information${data.cached ? ' (cached result)' : ''}`,
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

  const getUrgencyColor = (score: number) => {
    if (score >= 8) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 6) return "text-orange-600 bg-orange-50 border-orange-200";
    if (score >= 4) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'recalls': return AlertTriangle;
      case 'deadlines': return Calendar;
      case 'guidance': return FileText;
      default: return Search;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Regulatory Intelligence Search</span>
          </CardTitle>
          <CardDescription>
            Search for real-time regulatory information from FDA, USDA, EPA, and other government sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={filters.searchType} onValueChange={(value) => setFilters(prev => ({ ...prev, searchType: value }))}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="recalls">Recalls</TabsTrigger>
              <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
              <TabsTrigger value="guidance">Guidance</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="general-query">Search for regulatory updates and compliance information</Label>
                <Input
                  id="general-query"
                  placeholder="e.g., FDA food safety modernization act updates"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </TabsContent>

            <TabsContent value="recalls" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recalls-query">Search for food safety recalls and contamination events</Label>
                <Input
                  id="recalls-query"
                  placeholder="e.g., E. coli contamination lettuce recall 2024"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </TabsContent>

            <TabsContent value="deadlines" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deadlines-query">Search for upcoming compliance deadlines and requirements</Label>
                <Input
                  id="deadlines-query"
                  placeholder="e.g., FDA HARPC compliance deadline 2024"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </TabsContent>

            <TabsContent value="guidance" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guidance-query">Search for new guidance documents and policy updates</Label>
                <Input
                  id="guidance-query"
                  placeholder="e.g., new FDA dietary supplement guidance 2024"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Agencies</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {agencies.map((agency) => (
                  <div key={agency.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={agency.id}
                      checked={filters.agencies.includes(agency.id)}
                      onCheckedChange={(checked) => handleAgencyChange(agency.id, checked as boolean)}
                    />
                    <Label htmlFor={agency.id} className="text-sm">{agency.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Industry Focus</Label>
              <Select value={filters.industry} onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={filters.timeRange} onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last 24 hours</SelectItem>
                  <SelectItem value="week">Last week</SelectItem>
                  <SelectItem value="month">Last month</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={loading || !query.trim()}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            Search Regulatory Intelligence
          </Button>
        </CardContent>
      </Card>

      {/* Usage Info */}
      {usageInfo && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-700">
              <Target className="h-5 w-5" />
              <span className="font-medium">Search Limit Reached</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              You've used {usageInfo.current_usage}/{usageInfo.daily_limit} searches today on the {usageInfo.tier} plan.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/subscription" className="text-primary hover:underline">Upgrade Plan</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {React.createElement(getSearchTypeIcon(results.search_type), { className: "h-5 w-5" })}
                <span>Search Results</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                {results.cached && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Cached
                  </Badge>
                )}
                <Badge className={`text-xs ${getUrgencyColor(results.urgency_score)}`}>
                  Priority: {results.urgency_score}/10
                </Badge>
              </div>
            </div>
            <CardDescription>
              Query: "{results.query}" • {new Date(results.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agencies Mentioned */}
            {results.agencies_mentioned.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Agencies Mentioned</h4>
                <div className="flex flex-wrap gap-2">
                  {results.agencies_mentioned.map((agency) => (
                    <Badge key={agency} variant="outline">
                      <Shield className="w-3 h-3 mr-1" />
                      {agency}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div>
              <h4 className="font-medium mb-2">Regulatory Information</h4>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{results.content}</p>
              </div>
            </div>

            {/* Citations */}
            {results.citations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Official Sources</h4>
                <div className="space-y-2">
                  {results.citations.map((citation, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a 
                        href={citation} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {citation}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Questions */}
            {results.related_questions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Related Questions</h4>
                <div className="space-y-2">
                  {results.related_questions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto p-3 text-left"
                      onClick={() => setQuery(question)}
                    >
                      <span className="text-sm">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
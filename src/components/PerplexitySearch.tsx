import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export default function PerplexitySearch() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('general');
  const [agencies, setAgencies] = useState<string[]>([]);
  const [industry, setIndustry] = useState('');
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const availableAgencies = ['FDA', 'USDA', 'EPA', 'FSIS', 'CDC'];
  const industries = ['Food & Beverage', 'Pharmaceuticals', 'Medical Devices', 'Chemicals', 'Agriculture', 'Cosmetics'];

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: {
          query: query.trim(),
          agencies: agencies.length > 0 ? agencies : undefined,
          industry: industry || undefined,
          timeRange,
          searchType
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        if (data.limit_reached) {
          toast({
            title: "Search Limit Reached",
            description: data.error,
            variant: "destructive",
          });
        }
        throw new Error(data.error);
      }

      setResult(data);
      toast({
        title: "Search Complete",
        description: data.cached ? "Results from cache" : "Fresh results retrieved",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Check if it's an API key configuration issue
      if (errorMessage.includes('PERPLEXITY_API_KEY') || errorMessage.includes('not set')) {
        toast({
          title: "API Configuration Required",
          description: "Perplexity API key needs to be configured in Supabase Edge Function secrets.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getUrgencyLabel = (score: number) => {
    if (score >= 8) return 'High Priority';
    if (score >= 6) return 'Medium Priority';
    return 'Low Priority';
  };

  const toggleAgency = (agency: string) => {
    setAgencies(prev => 
      prev.includes(agency) 
        ? prev.filter(a => a !== agency)
        : [...prev, agency]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Regulatory Intelligence Search
          </CardTitle>
          <CardDescription>
            Search for the latest regulatory updates, recalls, deadlines, and guidance using AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search Query</label>
            <Input
              placeholder="e.g., FDA food safety updates, new labeling requirements..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Type</label>
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Updates</SelectItem>
                  <SelectItem value="recalls">Recalls & Alerts</SelectItem>
                  <SelectItem value="deadlines">Compliance Deadlines</SelectItem>
                  <SelectItem value="guidance">Guidance Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Past Day</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Filter by Agencies</label>
            <div className="flex flex-wrap gap-2">
              {availableAgencies.map(agency => (
                <Badge
                  key={agency}
                  variant={agencies.includes(agency) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleAgency(agency)}
                >
                  {agency}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Industry (Optional)</label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Industries</SelectItem>
                {industries.map(ind => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={loading || !query.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Regulatory Updates
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Search Error</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Search Results</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4" />
                  {new Date(result.timestamp).toLocaleString()}
                  {result.cached && <Badge variant="outline">Cached</Badge>}
                </CardDescription>
              </div>
              <Badge className={getUrgencyColor(result.urgency_score)}>
                {getUrgencyLabel(result.urgency_score)} ({result.urgency_score}/10)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Summary</h4>
              <Textarea
                value={result.content}
                readOnly
                className="min-h-[200px] resize-none"
              />
            </div>

            {result.agencies_mentioned.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Agencies Mentioned</h4>
                <div className="flex flex-wrap gap-2">
                  {result.agencies_mentioned.map(agency => (
                    <Badge key={agency} variant="secondary">{agency}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.citations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Official Sources</h4>
                <div className="space-y-2">
                  {result.citations.map((citation, index) => (
                    <a
                      key={index}
                      href={citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {citation}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {result.related_questions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Related Questions</h4>
                <div className="space-y-2">
                  {result.related_questions.map((question, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => setQuery(question)}
                    >
                      <p className="text-sm">{question}</p>
                    </div>
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
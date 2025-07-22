import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, Clock, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  content: string;
  citations: string[];
  relatedQuestions: string[];
  urgencyScore: number;
  agenciesMentioned: string[];
  searchType: string;
  query: string;
  timestamp: string;
  cached?: boolean;
  enhancedKeywords?: string;
  smartSummary?: string;
}

export default function GPTSearch() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('smart_search');
  const [agencies, setAgencies] = useState<string[]>([]);
  const [industry, setIndustry] = useState('');
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchTime, setLastSearchTime] = useState<number>(0);
  const { toast } = useToast();

  const availableAgencies = ['FDA', 'USDA', 'EPA', 'FSIS', 'CDC', 'OSHA', 'FTC', 'EFSA', 'Health Canada'];
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

    // Rate limiting: prevent searches within 3 seconds of each other
    const now = Date.now();
    if (now - lastSearchTime < 3000) {
      toast({
        title: "Search Too Frequent",
        description: "Please wait a moment before searching again",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setLastSearchTime(now);

    try {
      // Add timeout to prevent hanging requests
      const timeoutId = setTimeout(() => {
        throw new Error('Search request timed out');
      }, 30000); // 30 second timeout

      const { data, error } = await supabase.functions.invoke('gpt-search', {
        body: {
          query: query.trim(),
          agencies: agencies.length > 0 ? agencies : undefined,
          industry: industry || undefined,
          timeRange,
          searchType
        }
      });

      clearTimeout(timeoutId);

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
        description: data.cached ? "Results from cache" : "Fresh AI analysis retrieved",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Check if it's an API key configuration issue
      if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('not configured')) {
        toast({
          title: "API Configuration Required",
          description: "OpenAI API key needs to be configured in Supabase Edge Function secrets.",
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
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI-Powered Regulatory Intelligence
          </CardTitle>
          <CardDescription>
            Search for regulatory updates using GPT-4.1 for enhanced analysis, keyword extraction, and smart summaries
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
                  <SelectItem value="smart_search">Smart Analysis</SelectItem>
                  <SelectItem value="enhanced_keywords">Keyword Extraction</SelectItem>
                  <SelectItem value="summary_generation">Summary Generation</SelectItem>
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
                Analyzing with GPT-4.1...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Search & Analysis
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  GPT-4.1 Analysis Results
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4" />
                  {new Date(result.timestamp).toLocaleString()}
                  {result.cached && <Badge variant="outline">Cached</Badge>}
                </CardDescription>
              </div>
              <Badge className={getUrgencyColor(result.urgencyScore)}>
                {getUrgencyLabel(result.urgencyScore)} ({result.urgencyScore}/10)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                AI Analysis
              </h4>
              <Textarea
                value={result.content}
                readOnly
                className="min-h-[200px] resize-none"
              />
            </div>

            {result.enhancedKeywords && (
              <div>
                <h4 className="font-medium mb-2">Enhanced Keywords</h4>
                <Badge variant="secondary" className="text-sm">{result.enhancedKeywords}</Badge>
              </div>
            )}

            {result.agenciesMentioned.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Agencies Mentioned</h4>
                <div className="flex flex-wrap gap-2">
                  {result.agenciesMentioned.map(agency => (
                    <Badge key={agency} variant="secondary">{agency}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.citations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Suggested Sources</h4>
                <div className="space-y-2">
                  {result.citations.map((citation, index) => (
                    <a
                      key={index}
                      href={`https://www.google.com/search?q=site:${citation}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Search {citation}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {result.relatedQuestions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Related Questions</h4>
                <div className="space-y-2">
                  {result.relatedQuestions.map((question, index) => (
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
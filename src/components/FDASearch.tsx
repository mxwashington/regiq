import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
  Building,
  MapPin,
  User,
  Pill,
  Utensils,
  Activity,
  CheckCircle,
  XCircle,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { fdaApi, FDAResponse, FDAEnforcementResult, FDAEventResult, FDAShortageResult } from '@/lib/fda-api';
import { fdaQueryHelper, QuerySuggestion, QueryValidation } from '@/lib/fda-query-helper';

interface FDASearchFilters {
  endpoint: string;
  classification: string;
  state: string;
  dateRange: string;
  voluntaryMandated: string;
  productType: string;
}

interface FDASearchResults {
  endpoint: string;
  data: FDAResponse<any>;
  error?: string;
}

export function FDASearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FDASearchResults[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'single' | 'multiple'>('single');
  const [filters, setFilters] = useState<FDASearchFilters>({
    endpoint: 'all_enforcement',
    classification: '',
    state: '',
    dateRange: '30',
    voluntaryMandated: '',
    productType: ''
  });
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>(['foodEnforcement', 'drugEnforcement']);
  
  // Smart Query Features
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [queryValidation, setQueryValidation] = useState<QueryValidation | null>(null);
  const [expandedQuery, setExpandedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const endpoints = [
    { id: 'all_enforcement', name: 'All Enforcement Actions', icon: Shield },
    { id: 'foodEnforcement', name: 'Food Recalls', icon: Utensils },
    { id: 'drugEnforcement', name: 'Drug Recalls', icon: Pill },
    { id: 'deviceEnforcement', name: 'Device Recalls', icon: Activity },
    { id: 'foodEvents', name: 'Food Adverse Events', icon: AlertTriangle },
    { id: 'drugEvents', name: 'Drug Adverse Events', icon: AlertTriangle },
    { id: 'drugShortages', name: 'Drug Shortages', icon: Calendar },
    { id: 'animalEvents', name: 'Animal Events', icon: Activity }
  ];

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 
    'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 
    'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const handleQuickSearch = async (quickType: 'recent' | 'classI' | 'listeria' | 'shortages') => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let searchResults: FDASearchResults[] = [];

      switch (quickType) {
        case 'recent':
          const recentData = await fdaApi.getRecentRecalls(7);
          searchResults = [
            { endpoint: 'foodEnforcement', data: recentData[0] },
            { endpoint: 'drugEnforcement', data: recentData[1] },
            { endpoint: 'deviceEnforcement', data: recentData[2] }
          ];
          setQuery('Recent recalls (last 7 days)');
          break;

        case 'classI':
          const classIData = await fdaApi.getClassIRecalls();
          searchResults = [
            { endpoint: 'foodEnforcement', data: classIData[0] },
            { endpoint: 'drugEnforcement', data: classIData[1] },
            { endpoint: 'deviceEnforcement', data: classIData[2] }
          ];
          setQuery('Class I recalls');
          break;

        case 'listeria':
          const listeriaQuery = 'product_description:listeria OR reason_for_recall:listeria';
          const listeriaData = await fdaApi.searchMultipleEndpoints(listeriaQuery, ['foodEnforcement'], 20);
          searchResults = listeriaData;
          setQuery('Listeria contamination');
          break;

        case 'shortages':
          const shortageData = await fdaApi.searchDrugShortages({ limit: 20 });
          searchResults = [{ endpoint: 'drugShortages', data: shortageData }];
          setQuery('Current drug shortages');
          break;
      }

      setResults(searchResults);
      toast({
        title: "Search Complete",
        description: `Found ${searchResults.reduce((sum, r) => sum + r.data.results.length, 0)} results`,
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

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Search Error",
        description: "Please enter a search query.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let searchResults: FDASearchResults[] = [];

      if (searchMode === 'single' && filters.endpoint !== 'all_enforcement') {
        // Single endpoint search
        const params = buildSearchParams();
        const endpointMap: Record<string, any> = {
          foodEnforcement: () => fdaApi.searchFoodEnforcement(params),
          drugEnforcement: () => fdaApi.searchDrugEnforcement(params),
          deviceEnforcement: () => fdaApi.searchDeviceEnforcement(params),
          foodEvents: () => fdaApi.searchFoodEvents(params),
          drugEvents: () => fdaApi.searchDrugEvents(params),
          drugShortages: () => fdaApi.searchDrugShortages(params),
          animalEvents: () => fdaApi.searchAnimalEvents(params),
          drugLabels: () => fdaApi.searchDrugLabels(params),
          devicePma: () => fdaApi.searchDevicePma(params),
          tobaccoProblems: () => fdaApi.searchTobaccoProblems(params)
        };

        const method = endpointMap[filters.endpoint];
        if (method) {
          const data = await method();
          searchResults = [{ endpoint: filters.endpoint, data }];
        }
      } else {
        // Multiple endpoint search
        const endpointsToSearch = filters.endpoint === 'all_enforcement' 
          ? ['foodEnforcement', 'drugEnforcement', 'deviceEnforcement'] as const
          : selectedEndpoints as any;
        
        searchResults = await fdaApi.searchMultipleEndpoints(query, endpointsToSearch, 10);
      }

      setResults(searchResults);
      toast({
        title: "Search Complete",
        description: `Found ${searchResults.reduce((sum, r) => sum + r.data.results.length, 0)} results`,
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

  const buildSearchParams = () => {
    const params: any = { search: query, limit: 20 };

    if (filters.classification) {
      params.search += `+AND+classification:"${filters.classification}"`;
    }

    if (filters.state) {
      params.search += `+AND+state:"${filters.state}"`;
    }

    if (filters.voluntaryMandated) {
      params.search += `+AND+voluntary_mandated:"${filters.voluntaryMandated}"`;
    }

    if (filters.dateRange) {
      const days = parseInt(filters.dateRange);
      const date = new Date();
      date.setDate(date.getDate() - days);
      const dateString = date.toISOString().split('T')[0];
      params.search += `+AND+recall_initiation_date:[${dateString}+TO+*]`;
    }

    return params;
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Class I': return 'bg-red-100 text-red-800 border-red-200';
      case 'Class II': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Class III': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEndpointIcon = (endpoint: string) => {
    const endpointData = endpoints.find(e => e.id === endpoint);
    return endpointData?.icon || Search;
  };

  const getEndpointName = (endpoint: string) => {
    const endpointData = endpoints.find(e => e.id === endpoint);
    return endpointData?.name || endpoint;
  };

  const handleEndpointToggle = (endpointId: string, checked: boolean) => {
    setSelectedEndpoints(prev => 
      checked 
        ? [...prev, endpointId]
        : prev.filter(id => id !== endpointId)
    );
  };

  // Smart Query Features
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    
    // Get suggestions
    if (value.length >= 2) {
      const newSuggestions = fdaQueryHelper.getSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // Validate query
    if (value.length > 0) {
      const validation = fdaQueryHelper.validateQuery(value);
      setQueryValidation(validation);
      
      // Set expanded query
      const expanded = fdaQueryHelper.expandQuery(value);
      setExpandedQuery(expanded !== value ? expanded : '');
    } else {
      setQueryValidation(null);
      setExpandedQuery('');
    }
  };

  const handleSuggestionClick = (suggestion: QuerySuggestion) => {
    setQuery(suggestion.term);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pathogen': return AlertTriangle;
      case 'allergen': return Shield;
      case 'company': return Building;
      case 'product': return Pill;
      case 'classification': return FileText;
      case 'drug': return Pill;
      case 'device': return Activity;
      default: return Search;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Search Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Quick FDA Searches</span>
          </CardTitle>
          <CardDescription>
            Access common FDA database searches with pre-built queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('recent')}
              disabled={loading}
              className="h-20 flex flex-col items-center space-y-2"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm font-medium">Recent Recalls</span>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('classI')}
              disabled={loading}
              className="h-20 flex flex-col items-center space-y-2"
            >
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <span className="text-sm font-medium">Class I Alerts</span>
              <span className="text-xs text-muted-foreground">Critical recalls</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('listeria')}
              disabled={loading}
              className="h-20 flex flex-col items-center space-y-2"
            >
              <Utensils className="h-6 w-6 text-orange-500" />
              <span className="text-sm font-medium">Listeria Events</span>
              <span className="text-xs text-muted-foreground">Food contamination</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('shortages')}
              disabled={loading}
              className="h-20 flex flex-col items-center space-y-2"
            >
              <Pill className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-medium">Drug Shortages</span>
              <span className="text-xs text-muted-foreground">Current shortages</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>FDA Database Search</span>
          </CardTitle>
          <CardDescription>
            Search official FDA databases for enforcement actions, recalls, adverse events, and drug shortages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchMode} onValueChange={(value) => setSearchMode(value as 'single' | 'multiple')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Database</TabsTrigger>
              <TabsTrigger value="multiple">Multiple Databases</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="single-query">Smart Search Query</Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="single-query"
                    placeholder="Start typing... e.g., list, salm, peanut"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    className={queryValidation && !queryValidation.isValid ? 'border-red-300' : ''}
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Auto-suggest dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {React.createElement(getCategoryIcon(suggestion.category), { 
                              className: "w-4 h-4 text-gray-400" 
                            })}
                            <span className="font-medium">{suggestion.term}</span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.category}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="text-xs text-gray-500">
                              {Math.round(suggestion.confidence * 100)}%
                            </div>
                          </div>
                        </div>
                        {suggestion.expandedTerms && suggestion.expandedTerms.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Also searches: {suggestion.expandedTerms.slice(0, 3).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Query validation feedback */}
                {queryValidation && (
                  <div className="space-y-2">
                    {!queryValidation.isValid && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        <span>Query has syntax issues</span>
                      </div>
                    )}
                    {queryValidation.isValid && query.length > 0 && (
                      <div className="flex items-center space-x-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Query syntax is valid</span>
                      </div>
                    )}
                    {queryValidation.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                )}

                {/* Smart expansion preview */}
                {expandedQuery && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-center space-x-2 text-blue-700 text-sm mb-2">
                      <Lightbulb className="w-4 h-4" />
                      <span>Smart expansion will also search:</span>
                    </div>
                    <div className="text-xs text-blue-600 font-mono bg-background p-2 rounded border">
                      {expandedQuery}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>FDA Database</Label>
                <Select value={filters.endpoint} onValueChange={(value) => setFilters(prev => ({ ...prev, endpoint: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.id} value={endpoint.id}>
                        {endpoint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="multiple" className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="multiple-query">Smart Search Query</Label>
                <div className="relative">
                  <Input
                    id="multiple-query"
                    placeholder="Start typing... e.g., E. coli outbreak, drug shortage"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    className={queryValidation && !queryValidation.isValid ? 'border-red-300' : ''}
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Auto-suggest dropdown for multiple search */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {React.createElement(getCategoryIcon(suggestion.category), { 
                              className: "w-4 h-4 text-gray-400" 
                            })}
                            <span className="font-medium">{suggestion.term}</span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Query validation for multiple search */}
                {queryValidation && !queryValidation.isValid && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <XCircle className="w-4 h-4" />
                      <span>Query has syntax issues</span>
                    </div>
                    {queryValidation.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select Databases to Search</Label>
                <div className="grid grid-cols-2 gap-4">
                  {endpoints.slice(1, 7).map((endpoint) => (
                    <div key={endpoint.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={endpoint.id}
                        checked={selectedEndpoints.includes(endpoint.id)}
                        onCheckedChange={(checked) => handleEndpointToggle(endpoint.id, checked as boolean)}
                      />
                      <Label htmlFor={endpoint.id} className="text-sm flex items-center space-x-2">
                        {React.createElement(endpoint.icon, { className: "w-4 h-4" })}
                        <span>{endpoint.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Classification</Label>
              <Select value={filters.classification} onValueChange={(value) => setFilters(prev => ({ ...prev, classification: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classifications</SelectItem>
                  <SelectItem value="Class I">Class I (Most serious)</SelectItem>
                  <SelectItem value="Class II">Class II (Moderate)</SelectItem>
                  <SelectItem value="Class III">Class III (Least serious)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>State</Label>
              <Select value={filters.state} onValueChange={(value) => setFilters(prev => ({ ...prev, state: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All States</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.voluntaryMandated} onValueChange={(value) => setFilters(prev => ({ ...prev, voluntaryMandated: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Voluntary">Voluntary</SelectItem>
                  <SelectItem value="FDA Mandated">FDA Mandated</SelectItem>
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
            Search FDA Database
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
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {React.createElement(getEndpointIcon(result.endpoint), { className: "h-5 w-5" })}
                  <span>{getEndpointName(result.endpoint)}</span>
                  <Badge variant="outline">
                    {result.data.results.length} results
                  </Badge>
                  {result.data.cached && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Cached
                    </Badge>
                  )}
                </CardTitle>
                {result.error && (
                  <CardDescription className="text-red-600">
                    Error: {result.error}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {result.data.results.length > 0 ? (
                  <div className="space-y-4">
                    {result.data.results.slice(0, 5).map((item: any, itemIndex: number) => (
                      <div key={itemIndex} className="border rounded-lg p-4 space-y-2">
                        {/* Enforcement Results */}
                        {item.recall_number && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge className={getClassificationColor(item.classification)}>
                                {item.classification}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Recall #{item.recall_number}
                              </span>
                            </div>
                            <h4 className="font-semibold">{item.product_description}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <span>{item.company_name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{new Date(item.recall_initiation_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{item.city}, {item.state}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{item.voluntary_mandated}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <strong>Reason:</strong> {item.reason_for_recall}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Distribution:</strong> {item.distribution_pattern}
                            </p>
                          </div>
                        )}

                        {/* Drug Shortage Results */}
                        {item.product_name && result.endpoint === 'drugShortages' && (
                          <div className="space-y-2">
                            <h4 className="font-semibold">{item.product_name}</h4>
                            <Badge variant="outline">{item.status}</Badge>
                            {item.active_ingredients && (
                              <div className="text-sm">
                                <strong>Active Ingredients:</strong>
                                <ul className="list-disc list-inside ml-4">
                                  {item.active_ingredients.map((ingredient: any, i: number) => (
                                    <li key={i}>{ingredient.name} ({ingredient.strength})</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="text-sm text-muted-foreground">
                              <strong>Reason:</strong> {item.reason}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Last Updated:</strong> {new Date(item.revision_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        {/* Event Results */}
                        {item.safetyreportid && (
                          <div className="space-y-2">
                            <h4 className="font-semibold">Adverse Event Report #{item.safetyreportid}</h4>
                            <div className="text-sm">
                              <strong>Country:</strong> {item.occurcountry || item.primarysourcecountry}
                            </div>
                            {item.serious && (
                              <Badge variant="destructive">Serious Event</Badge>
                            )}
                            <p className="text-sm text-muted-foreground">
                              <strong>Received:</strong> {item.receivedate}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {result.data.results.length > 5 && (
                      <div className="text-center">
                        <Badge variant="outline">
                          Showing 5 of {result.data.results.length} results
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No results found in this database
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEntitlements } from '@/hooks/useEntitlements';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';
import { 
  Search, 
  Loader2, 
  BookOpen, 
  Scale,
  ExternalLink,
  Clock,
  Shield,
  FileText,
  Building,
  Bookmark,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Calendar,
  Lightbulb,
  Link,
  Target
} from 'lucide-react';
import { cfrApi, CFRSearchParams, CFRSearchResult, CFRSection, CFR_TITLES, PRIORITY_CFR_PARTS } from '@/lib/cfr-api';

export function CFRSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CFRSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'text' | 'citation' | 'requirements' | 'definitions'>('text');
  const [selectedTitle, setSelectedTitle] = useState<number | undefined>(21); // Default to FDA
  const [selectedPart, setSelectedPart] = useState<number | undefined>();
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [bookmarkedSections, setBookmarkedSections] = useState<string[]>([]);
  const [showCitationBuilder, setShowCitationBuilder] = useState(false);

  const { toast } = useToast();
  const { getFeatureValue } = useEntitlements();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleQuickSearch = async (quickType: 'food_safety' | 'gmp' | 'haccp' | 'labeling' | 'medical_devices') => {
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
      let searchResults: CFRSection[] = [];
      let queryText = '';

      switch (quickType) {
        case 'food_safety':
          searchResults = await cfrApi.getFoodSafetyRegulations();
          queryText = 'Food Safety Regulations';
          break;
        case 'gmp':
          searchResults = await cfrApi.searchCFR({
            query: 'good manufacturing practice current',
            searchType: 'text'
          }).then(r => r.sections);
          queryText = 'Good Manufacturing Practice (GMP)';
          break;
        case 'haccp':
          searchResults = await cfrApi.searchCFR({
            query: 'hazard analysis critical control point',
            searchType: 'text'
          }).then(r => r.sections);
          queryText = 'HACCP Requirements';
          break;
        case 'labeling':
          searchResults = await cfrApi.searchCFR({
            query: 'labeling requirements',
            title: 21,
            searchType: 'text'
          }).then(r => r.sections);
          queryText = 'Labeling Requirements';
          break;
        case 'medical_devices':
          searchResults = await cfrApi.getMedicalDeviceRegulations();
          queryText = 'Medical Device Regulations';
          break;
      }

      const mockResult: CFRSearchResult = {
        sections: searchResults,
        totalResults: searchResults.length,
        searchTerms: queryText.split(' '),
        suggestedCitations: [],
        relatedSections: [],
        lastUpdated: new Date().toISOString()
      };

      setResults(mockResult);
      setQuery(queryText);
      toast({
        title: "CFR Search Complete",
        description: `Found ${searchResults.length} relevant CFR sections`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CFR search failed';
      setError(errorMessage);
      toast({
        title: "CFR Search Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCFRSearch = async () => {
    if (!query.trim() && searchType !== 'citation') {
      toast({
        title: "Search Error",
        description: "Please enter a search query or CFR citation.",
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
      const searchParams: CFRSearchParams = {
        searchType,
        query: query.trim()
      };

      if (searchType === 'citation') {
        if (!selectedTitle || !selectedPart) {
          throw new Error('Please specify Title and Part for citation lookup');
        }
        searchParams.title = selectedTitle;
        searchParams.part = selectedPart;
        searchParams.section = selectedSection || undefined;
      } else {
        if (selectedTitle) {
          searchParams.title = selectedTitle;
        }
      }

      const searchResult = await cfrApi.searchCFR(searchParams);
      setResults(searchResult);

      toast({
        title: "CFR Search Complete",
        description: `Found ${searchResult.totalResults} CFR sections`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CFR search failed';
      setError(errorMessage);
      toast({
        title: "CFR Search Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = (citation: string) => {
    if (bookmarkedSections.includes(citation)) {
      setBookmarkedSections(prev => prev.filter(c => c !== citation));
      toast({
        title: "Bookmark Removed",
        description: `Removed ${citation} from bookmarks`,
      });
    } else {
      setBookmarkedSections(prev => [...prev, citation]);
      toast({
        title: "Bookmark Added",
        description: `Added ${citation} to bookmarks`,
      });
    }
  };

  const copyCitation = (citation: string) => {
    navigator.clipboard.writeText(citation);
    toast({
      title: "Citation Copied",
      description: `${citation} copied to clipboard`,
    });
  };

  const getTitleColor = (titleNumber: number) => {
    const title = CFR_TITLES.find(t => t.number === titleNumber);
    return title?.color || 'gray';
  };

  const getPriorityBadge = (titleNumber: number) => {
    const title = CFR_TITLES.find(t => t.number === titleNumber);
    const priority = title?.priority || 'LOW';
    
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCFRText = (text: string, searchTerms: string[]) => {
    let formattedText = text;
    
    // Highlight search terms
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      formattedText = formattedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });
    
    return { __html: formattedText };
  };

  return (
    <div className="space-y-6">
      {/* Quick CFR Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Quick CFR Searches</span>
          </CardTitle>
          <CardDescription>
            Access common CFR regulations with pre-built searches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('food_safety')}
              disabled={loading}
              className="h-28 flex flex-col items-center justify-center space-y-2 p-4"
            >
              <Shield className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-medium text-center">Food Safety</span>
              <span className="text-xs text-muted-foreground text-center">21 CFR 110-123</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('gmp')}
              disabled={loading}
              className="h-28 flex flex-col items-center justify-center space-y-2 p-4"
            >
              <Building className="h-6 w-6 text-green-500" />
              <span className="text-sm font-medium text-center">GMP Rules</span>
              <span className="text-xs text-muted-foreground text-center">Manufacturing</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('haccp')}
              disabled={loading}
              className="h-28 flex flex-col items-center justify-center space-y-2 p-4"
            >
              <Target className="h-6 w-6 text-orange-500" />
              <span className="text-sm font-medium text-center">HACCP</span>
              <span className="text-xs text-muted-foreground text-center">Control Points</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('labeling')}
              disabled={loading}
              className="h-28 flex flex-col items-center justify-center space-y-2 p-4"
            >
              <FileText className="h-6 w-6 text-purple-500" />
              <span className="text-sm font-medium text-center">Labeling</span>
              <span className="text-xs text-muted-foreground text-center">Requirements</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickSearch('medical_devices')}
              disabled={loading}
              className="h-28 flex flex-col items-center justify-center space-y-2 p-4"
            >
              <Scale className="h-6 w-6 text-teal-500" />
              <span className="text-sm font-medium text-center">Medical Devices</span>
              <span className="text-xs text-muted-foreground text-center">21 CFR 800+</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CFR Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>CFR Search & Citation Lookup</span>
          </CardTitle>
          <CardDescription>
            Search Code of Federal Regulations text or lookup specific CFR citations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchType} onValueChange={(value) => setSearchType(value as any)}>
            <TabsList className="flex flex-col w-full h-auto md:grid md:grid-cols-4 md:h-10">
              <TabsTrigger value="text" className="w-full justify-start md:justify-center">Text Search</TabsTrigger>
              <TabsTrigger value="citation" className="w-full justify-start md:justify-center">Citation Lookup</TabsTrigger>
              <TabsTrigger value="requirements" className="w-full justify-start md:justify-center">Requirements</TabsTrigger>
              <TabsTrigger value="definitions" className="w-full justify-start md:justify-center">Definitions</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-query">Search CFR Text</Label>
                <Input
                  id="text-query"
                  placeholder="e.g., good manufacturing practice, hazard analysis, labeling requirements"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCFRSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label>CFR Title (Optional)</Label>
                <Select value={selectedTitle?.toString()} onValueChange={(value) => setSelectedTitle(value ? parseInt(value) : undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search all titles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Titles</SelectItem>
                    {CFR_TITLES.map((title) => (
                      <SelectItem key={title.number} value={title.number.toString()}>
                        Title {title.number} - {title.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="citation" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CFR Title</Label>
                  <Select value={selectedTitle?.toString()} onValueChange={(value) => setSelectedTitle(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select title" />
                    </SelectTrigger>
                    <SelectContent>
                      {CFR_TITLES.map((title) => (
                        <SelectItem key={title.number} value={title.number.toString()}>
                          Title {title.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>CFR Part</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 117"
                    value={selectedPart || ''}
                    onChange={(e) => setSelectedPart(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Section (Optional)</Label>
                  <Input
                    placeholder="e.g., 1 or 3(a)"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                  />
                </div>
              </div>

              {selectedTitle && selectedPart && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-center space-x-2 text-blue-700 text-sm">
                    <Link className="w-4 h-4" />
                    <span>Citation Preview:</span>
                  </div>
                  <div className="text-blue-800 font-mono mt-1">
                    {selectedTitle} CFR {selectedPart}{selectedSection ? `.${selectedSection}` : ''}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="requirements" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requirements-query">Search CFR Requirements</Label>
                <Input
                  id="requirements-query"
                  placeholder="e.g., training requirements, documentation, validation"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCFRSearch()}
                />
                <p className="text-sm text-muted-foreground">
                  Find specific regulatory requirements and compliance obligations
                </p>
              </div>
            </TabsContent>

            <TabsContent value="definitions" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="definitions-query">Search CFR Definitions</Label>
                <Input
                  id="definitions-query"
                  placeholder="e.g., adequate, hazard, food, current good manufacturing practice"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCFRSearch()}
                />
                <p className="text-sm text-muted-foreground">
                  Look up official regulatory definitions and terminology
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            onClick={handleCFRSearch} 
            disabled={loading || (!query.trim() && searchType !== 'citation')}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            Search CFR
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">CFR Search Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* CFR Search Results */}
      {results && (
        <div className="space-y-4">
          {/* Results Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>CFR Search Results</span>
                  <Badge variant="outline">
                    {results.totalResults} sections found
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Updated: {new Date(results.lastUpdated).toLocaleDateString()}</span>
                </div>
              </CardTitle>
              {results.suggestedCitations.length > 0 && (
                <CardDescription>
                  <div className="flex items-center space-x-2 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <span>Suggested related citations:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.suggestedCitations.slice(0, 5).map((citation, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {citation}
                      </Badge>
                    ))}
                  </div>
                </CardDescription>
              )}
            </CardHeader>
          </Card>

          {/* CFR Sections */}
          {results.sections.map((section, index) => (
            <Card key={`${section.citation}-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityBadge(section.title)}>
                        Title {section.title}
                      </Badge>
                      <h3 className="font-mono text-lg font-semibold">{section.citation}</h3>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Effective: {section.effectiveDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Last Revised: {section.lastRevised}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyCitation(section.citation)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBookmark(section.citation)}
                    >
                      <Bookmark 
                        className={`w-4 h-4 ${bookmarkedSections.includes(section.citation) ? 'fill-current' : ''}`} 
                      />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hierarchy */}
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Hierarchy: </span>
                  {section.hierarchy.join(' → ')}
                </div>

                {/* CFR Text */}
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gray-50 p-4 rounded border-l-4 border-blue-500">
                    {/* Safe text rendering without XSS risk */}
                    {section.text}
                  </div>
                </div>

                {/* Requirements */}
                {section.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Key Requirements</span>
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {section.requirements.map((req, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Definitions */}
                {section.definitions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Definitions</span>
                    </h4>
                    <div className="space-y-2">
                      {section.definitions.map((def, i) => (
                        <div key={i} className="bg-blue-50 p-3 rounded text-sm">
                          <span className="font-medium text-blue-800">{def.term}:</span>
                          <span className="text-blue-700 ml-2">{def.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deadlines */}
                {section.deadlines.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span>Compliance Deadlines</span>
                    </h4>
                    <div className="space-y-2">
                      {section.deadlines.map((deadline, i) => (
                        <div key={i} className="bg-orange-50 p-3 rounded text-sm flex items-center justify-between">
                          <span>{deadline.requirement}</span>
                          <Badge variant="outline" className="text-orange-700">
                            {deadline.deadline}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cross References */}
                {section.crossReferences.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Related CFR Sections</h4>
                    <div className="flex flex-wrap gap-2">
                      {section.crossReferences.map((ref, i) => (
                        <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
                          <Link className="w-3 h-3 mr-1" />
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';
import { RegulatorySearch } from '@/components/RegulatorySearch';
import { FDASearch } from '@/components/FDASearch';
import { CombinedSearch } from '@/components/CombinedSearch';
import { FDAAnalyticsDashboard } from '@/components/FDAAnalyticsDashboard';
import { FDAProfessionalTools } from '@/components/FDAProfessionalTools';
import { IntegrationEnhancements } from '@/components/IntegrationEnhancements';
import { CFRSearch } from '@/components/CFRSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Zap, 
  Target, 
  Clock,
  Shield,
  ArrowLeft,
  Globe,
  Database,
  Activity,
  BarChart3,
  Settings,
  GitMerge,
  BookOpen,
  Filter
} from 'lucide-react';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { SourceFilterResults } from '@/components/filters/SourceFilterResults';
import { useSourceFilters } from '@/hooks/useSourceFilters';
import { FilterQuery } from '@/types/filter-engine';

export default function SearchPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { trackInteraction } = useAnalytics();
  const { checkFeatureAccess } = usePlanRestrictions();
  const { executeQuery, results, loading: filterLoading, error, totalResults } = useSourceFilters();
  const [showFilters, setShowFilters] = React.useState(false);
  const [activeQuery, setActiveQuery] = React.useState<FilterQuery | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (!checkFeatureAccess('advanced_filters')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <FeaturePaywall
          feature="advanced_filters"
          context="Advanced search capabilities including regulatory databases, CFR search, and professional analytics tools require a Professional plan."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const searchLimits = {
    free: 5,
    starter: 25,
    professional: 100,
    enterprise: 500
  };

  const currentTier = 'free';
  const dailyLimit = searchLimits[currentTier as keyof typeof searchLimits] || 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Search className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Regulatory Search</span>
            </div>
          </div>
          
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Introduction */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">AI-Powered Regulatory Intelligence</h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl">
            Search for real-time regulatory information from FDA, USDA, EPA, and other government sources using advanced AI. 
            Get instant answers with official citations and urgency scoring.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="text-center">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-sm sm:text-lg">Real-Time Search</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <CardDescription className="text-xs sm:text-sm">
                Latest regulatory updates
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-sm sm:text-lg">Official Sources</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <CardDescription className="text-xs sm:text-sm">
                Government citations
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-sm sm:text-lg">Urgency Scoring</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <CardDescription className="text-xs sm:text-sm">
                AI priority scoring
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-sm sm:text-lg">Smart Caching</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <CardDescription className="text-xs sm:text-sm">
                Faster results
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Source Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Source Filters
              {totalResults > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {totalResults}
                </Badge>
              )}
            </Button>
            {activeQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveQuery(null);
                  setShowFilters(false);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
          
          {showFilters && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Filter Regulatory Sources</CardTitle>
                <CardDescription>
                  Apply filters to search across FDA, USDA, WHO, and other regulatory sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FilterPanel 
                  onFilterChange={(query) => {
                    setActiveQuery(query);
                    executeQuery(query);
                    trackInteraction(
                      'filter_applied', 
                      'source-filters',
                      'filter-panel',
                      { 
                        sources: query.sources.map(s => s.source_type),
                        shared_filters: Object.keys(query.shared)
                      }
                    );
                  }}
                  activeFilters={activeQuery || {
                    sources: [],
                    shared: {},
                    pagination: { limit: 20 },
                    sorting: { field: 'published_date', direction: 'desc' }
                  }}
                  loading={filterLoading}
                />
              </CardContent>
            </Card>
          )}
          
          {results.length > 0 && (
            <SourceFilterResults 
              results={results}
              loading={filterLoading}
              error={error}
              totalResults={totalResults}
              executionTime={0}
              cacheStats={{ hits: 0, misses: 0 }}
            />
          )}
        </div>

        {/* Comprehensive FDA Search System */}
        <Tabs defaultValue="web-intelligence" className="space-y-6">
          <TabsList className="flex flex-col w-full h-auto md:grid md:grid-cols-3 lg:grid-cols-5 md:h-10 gap-1 p-2">
            <TabsTrigger value="web-intelligence" className="flex items-center gap-1 px-2 py-2 text-sm w-full justify-start md:justify-center">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Web Intel</span>
              <span className="sm:hidden">Web</span>
            </TabsTrigger>
            <TabsTrigger value="fda-database" className="flex items-center gap-1 px-2 py-2 text-sm w-full justify-start md:justify-center">
              <Database className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">FDA API</span>
              <span className="sm:hidden">FDA</span>
            </TabsTrigger>
            <TabsTrigger value="cfr-regulations" className="flex items-center gap-1 px-2 py-2 text-sm w-full justify-start md:justify-center">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">CFR</span>
              <span className="sm:hidden">CFR</span>
            </TabsTrigger>
            <TabsTrigger value="combined-search" className="flex items-center gap-1 px-2 py-2 text-sm w-full justify-start md:justify-center">
              <Activity className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Combined</span>
              <span className="sm:hidden">Multi</span>
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-1 px-2 py-2 text-sm w-full justify-start md:justify-center">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Pro Tools</span>
              <span className="sm:hidden">Pro</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="web-intelligence">
            <RegulatorySearch />
          </TabsContent>


          <TabsContent value="fda-database">
            <FDASearch />
          </TabsContent>

          <TabsContent value="cfr-regulations">
            <CFRSearch />
          </TabsContent>

          <TabsContent value="combined-search">
            <CombinedSearch />
          </TabsContent>


          <TabsContent value="professional">
            <FDAProfessionalTools />
          </TabsContent>
        </Tabs>

        {/* Upgrade features are now handled by subscription enforcement */}
      </div>
    </div>
  );
}
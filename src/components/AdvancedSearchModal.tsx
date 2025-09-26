import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Calendar, ExternalLink, Clock, Shield, Target, X } from 'lucide-react';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdvancedSearchFilters {
  query: string;
  sources: string[];
  urgency: string[];
  dateRange: {
    from: string;
    to: string;
  };
  agencies: string[];
  contentType: string;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin } = useAuth();
  const { hasFeature } = useEntitlements();
  const { alerts, loading } = useSimpleAlerts();

  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    query: '',
    sources: [],
    urgency: [],
    dateRange: {
      from: '',
      to: ''
    },
    agencies: [],
    contentType: ''
  });

  interface SearchResult {
    id: string;
    title: string;
    summary: string;
    source: string;
    urgency: string;
    published_date: string;
    external_url?: string;
  }

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Check if user has access to advanced search
  const hasAdvancedSearch = isAdmin || hasFeature('advanced_search') || hasFeature('advanced_filters');

  const handleSearch = async () => {
    if (!filters.query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setSearching(true);
    try {
      logger.info('Performing advanced search with filters:', filters);

      // Filter alerts based on criteria
      const results = alerts.filter(alert => {
        // Text search
        const matchesQuery = !filters.query ||
          alert.title.toLowerCase().includes(filters.query.toLowerCase()) ||
          alert.summary.toLowerCase().includes(filters.query.toLowerCase()) ||
          alert.source.toLowerCase().includes(filters.query.toLowerCase());

        // Source filter
        const matchesSource = filters.sources.length === 0 ||
          filters.sources.some(source => alert.source.toLowerCase().includes(source.toLowerCase()));

        // Urgency filter
        const matchesUrgency = filters.urgency.length === 0 ||
          filters.urgency.includes(alert.urgency.toLowerCase());

        // Agency filter
        const matchesAgency = filters.agencies.length === 0 ||
          filters.agencies.some(agency => alert.source.toLowerCase().includes(agency.toLowerCase()));

        // Date range filter
        const alertDate = new Date(alert.published_date);
        const matchesDateRange = (!filters.dateRange.from || alertDate >= new Date(filters.dateRange.from)) &&
          (!filters.dateRange.to || alertDate <= new Date(filters.dateRange.to));

        return matchesQuery && matchesSource && matchesUrgency && matchesAgency && matchesDateRange;
      });

      setSearchResults(results);
      toast.success(`Found ${results.length} results`);
      logger.info('Advanced search completed:', { resultCount: results.length });

    } catch (error) {
      logger.error('Advanced search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleFilterChange = (key: keyof AdvancedSearchFilters, value: string | string[] | { from: string; to: string }) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMultiSelectChange = (key: 'sources' | 'urgency' | 'agencies', value: string) => {
    setFilters(prev => {
      const currentValues = prev[key];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [key]: newValues
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      sources: [],
      urgency: [],
      dateRange: { from: '', to: '' },
      agencies: [],
      contentType: ''
    });
    setSearchResults([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!hasAdvancedSearch) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Advanced Search
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Premium Feature</h3>
              <p className="text-muted-foreground text-sm">
                Advanced search with filters and analytics is available for Professional and Enterprise users.
              </p>
              <Button className="mt-4" onClick={onClose}>
                Upgrade to Access
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Regulatory Search
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Search Input */}
          <div className="space-y-2">
            <Label>Search Query</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Enter search terms..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sources */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['FDA', 'USDA', 'EPA', 'CDC', 'OSHA'].map((source) => (
                  <div key={source} className="flex items-center space-x-2">
                    <Checkbox
                      id={`source-${source}`}
                      checked={filters.sources.includes(source)}
                      onCheckedChange={() => handleMultiSelectChange('sources', source)}
                    />
                    <label htmlFor={`source-${source}`} className="text-sm">{source}</label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Urgency */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Urgency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['critical', 'high', 'medium', 'low'].map((urgency) => (
                  <div key={urgency} className="flex items-center space-x-2">
                    <Checkbox
                      id={`urgency-${urgency}`}
                      checked={filters.urgency.includes(urgency)}
                      onCheckedChange={() => handleMultiSelectChange('urgency', urgency)}
                    />
                    <label htmlFor={`urgency-${urgency}`} className="text-sm capitalize">{urgency}</label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Date Range</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label htmlFor="date-from" className="text-xs">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={filters.dateRange.from}
                    onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, from: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="date-to" className="text-xs">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filters.dateRange.to}
                    onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, to: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={searching || !filters.query.trim()}>
              {searching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              {isAdmin && (
                <Badge variant="secondary">Admin Access</Badge>
              )}
              <Badge variant="outline">
                {alerts.length} Total Alerts
              </Badge>
            </div>
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Search Results ({searchResults.length})
                </h3>
              </div>

              <div className="space-y-3 max-h-64 overflow-auto">
                {searchResults.map((alert) => (
                  <Card key={alert.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {alert.source}
                            </Badge>
                            <Badge
                              variant={alert.urgency.toLowerCase() === 'critical' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {alert.urgency}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(alert.published_date)}
                            </span>
                          </div>

                          <h4 className="font-medium text-sm mb-1 line-clamp-2">
                            {alert.title}
                          </h4>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {alert.summary}
                          </p>
                        </div>

                        {alert.external_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={alert.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && filters.query && !searching && (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedSearchModal;
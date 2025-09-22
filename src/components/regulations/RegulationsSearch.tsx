import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Building2, FileText, AlertTriangle, Clock, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { regulationsService } from '@/lib/regulations/regulationsService';
import {
  RegulationsGovDocument,
  ProcessedRegulationDocument,
  INDUSTRY_PRESETS,
  AGENCY_MAPPING
} from '@/lib/regulations/types';

interface RegulationsSearchProps {
  onResultSelect?: (document: ProcessedRegulationDocument) => void;
  industryFocus?: keyof typeof INDUSTRY_PRESETS;
}

export const RegulationsSearch: React.FC<RegulationsSearchProps> = ({
  onResultSelect,
  industryFocus
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState<string>('');
  const [dateRange, setDateRange] = useState('30');
  const [results, setResults] = useState<ProcessedRegulationDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  // Initialize with industry preset if provided
  useEffect(() => {
    if (industryFocus && INDUSTRY_PRESETS[industryFocus]) {
      const preset = INDUSTRY_PRESETS[industryFocus];
      setSelectedAgencies(preset.agencies);
    }
  }, [industryFocus]);

  const handleSearch = async () => {
    if (!searchTerm.trim() && selectedAgencies.length === 0) {
      toast({
        title: "Search Required",
        description: "Please enter a search term or select agencies to filter by.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const processedResults = await regulationsService.getProcessedDocuments(
        industryFocus,
        searchTerm,
        { size: 50 }
      );

      // Apply additional filters
      const filteredResults = processedResults.filter(doc => {
        if (selectedAgencies.length > 0 && !selectedAgencies.includes(doc.agency)) {
          return false;
        }
        if (documentType && doc.documentType !== documentType) {
          return false;
        }
        if (doc.publishedDate < startDate) {
          return false;
        }
        return true;
      });

      setResults(filteredResults);
      
      toast({
        title: "Search Complete",
        description: `Found ${filteredResults.length} relevant documents`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search regulations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      case 'Low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="comments">Open Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Regulations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search regulations, keywords, topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Agencies</label>
                  <Select
                    value={selectedAgencies.join(',')}
                    onValueChange={(value) => setSelectedAgencies(value ? value.split(',') : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agencies" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGENCY_MAPPING).map(([id, info]) => (
                        <SelectItem key={id} value={id}>
                          {id} - {info.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Document Type</label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="Rule">Final Rules</SelectItem>
                      <SelectItem value="Proposed Rule">Proposed Rules</SelectItem>
                      <SelectItem value="Notice">Notices</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 3 months</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Industry Preset Info */}
              {industryFocus && INDUSTRY_PRESETS[industryFocus] && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{INDUSTRY_PRESETS[industryFocus].name} Focus</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {INDUSTRY_PRESETS[industryFocus].description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {results.map((doc) => (
              <Card 
                key={doc.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onResultSelect?.(doc)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{doc.agency}</Badge>
                        <Badge className={getUrgencyColor(doc.urgencyLevel)}>
                          {doc.urgencyLevel}
                        </Badge>
                        {doc.isOpenForComment && (
                          <Badge variant="outline" className="border-blue-500 text-blue-700">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Open for Comment
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg leading-tight mb-2">
                        {doc.title}
                      </h3>
                      {doc.summary && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {doc.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {doc.documentType}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(doc.publishedDate)}
                      </div>
                      {doc.commentDeadline && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Clock className="h-3 w-3" />
                          Comment by {formatDate(doc.commentDeadline)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {doc.tags.length > 0 && (
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 6).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{doc.tags.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {results.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Results Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters to find relevant regulations.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <RecentDocuments industryFocus={industryFocus} />
        </TabsContent>

        <TabsContent value="comments">
          <OpenCommentPeriods industryFocus={industryFocus} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper components for other tabs
const RecentDocuments: React.FC<{ industryFocus?: keyof typeof INDUSTRY_PRESETS }> = ({ industryFocus }) => {
  const [documents, setDocuments] = useState<ProcessedRegulationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const results = await regulationsService.getProcessedDocuments(industryFocus, undefined, { size: 20 });
        setDocuments(results);
      } catch (error) {
        console.error('Failed to load recent documents:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadRecent();
  }, [industryFocus]);

  if (loading) {
    return <div>Loading recent documents...</div>;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{doc.title}</h4>
              <Badge className={
                doc.urgencyLevel === 'Critical' ? 'bg-destructive' :
                doc.urgencyLevel === 'High' ? 'bg-orange-500' :
                doc.urgencyLevel === 'Medium' ? 'bg-yellow-500' : 'bg-muted'
              }>
                {doc.urgencyLevel}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

const OpenCommentPeriods: React.FC<{ industryFocus?: keyof typeof INDUSTRY_PRESETS }> = ({ industryFocus }) => {
  const [documents, setDocuments] = useState<RegulationsGovDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOpenComments = async () => {
      try {
        const agencies = industryFocus ? INDUSTRY_PRESETS[industryFocus].agencies : undefined;
        const result = await regulationsService.getOpenCommentPeriods(agencies, { size: 20 });
        setDocuments(result.data);
      } catch (error) {
        console.error('Failed to load open comment periods:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOpenComments();
  }, [industryFocus]);

  if (loading) {
    return <div>Loading open comment periods...</div>;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{doc.attributes.title}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{doc.attributes.agencyId}</Badge>
                {doc.attributes.commentEndDate && (
                  <Badge variant="outline" className="text-orange-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(doc.attributes.commentEndDate).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};
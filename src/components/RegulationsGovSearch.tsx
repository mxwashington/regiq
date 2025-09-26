import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, MessageCircle, Calendar, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

import { logger } from '@/lib/logger';
interface RegulationDocument {
  id: string;
  title: string;
  documentType: string;
  agencyId: string;
  postedDate: string;
  summary: string;
  openForComment: boolean;
  commentEndDate?: string;
  url: string;
}

interface SearchResponse {
  documents: RegulationDocument[];
  total: number;
  meta: any;
}

const AGENCY_OPTIONS = [
  { value: 'FDA', label: 'FDA - Food and Drug Administration' },
  { value: 'EPA', label: 'EPA - Environmental Protection Agency' },
  { value: 'OSHA', label: 'OSHA - Occupational Safety and Health Administration' },
  { value: 'USDA', label: 'USDA - Department of Agriculture' },
  { value: 'CDC', label: 'CDC - Centers for Disease Control' },
  { value: 'DOT', label: 'DOT - Department of Transportation' },
  { value: 'FTC', label: 'FTC - Federal Trade Commission' },
  { value: 'DOL', label: 'DOL - Department of Labor' }
];

const DOCUMENT_TYPES = [
  { value: 'Rule', label: 'Final Rules' },
  { value: 'Proposed Rule', label: 'Proposed Rules' },
  { value: 'Notice', label: 'Notices' },
  { value: 'Other', label: 'Other Documents' }
];

export const RegulationsGovSearch = () => {
  const [query, setQuery] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [results, setResults] = useState<RegulationDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim() && !agencyId) {
      toast({
        title: "Search Required",
        description: "Please enter a search term or select an agency.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('regulations-gov-api', {
        body: {
          action: 'search',
          query: query.trim() || undefined,
          agencyId: agencyId || undefined,
          documentType: documentType || undefined,
          limit: 25
        }
      });

      if (error) {
        throw error;
      }

      const response = data as SearchResponse;
      setResults(response.documents || []);
      setTotal(response.total || 0);

      toast({
        title: "Search Completed",
        description: `Found ${response.total || 0} documents`,
      });

    } catch (error: any) {
      logger.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search regulations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (doc: RegulationDocument) => {
    const title = doc.title.toLowerCase();
    if (title.includes('recall') || title.includes('emergency') || title.includes('urgent')) {
      return 'destructive';
    } else if (title.includes('rule') || title.includes('regulation')) {
      return 'default';
    }
    return 'secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Regulations.gov Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search regulations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Agency" />
              </SelectTrigger>
              <SelectContent>
                {AGENCY_OPTIONS.map(agency => (
                  <SelectItem key={agency.value} value={agency.value}>
                    {agency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {total > 0 && (
            <div className="text-sm text-muted-foreground">
              Found {total} documents
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {results.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg leading-tight">
                      {doc.title}
                    </h3>
                    <Badge variant={getUrgencyColor(doc)}>
                      {doc.documentType}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {doc.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {doc.agencyId}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(doc.postedDate)}
                    </div>

                    {doc.openForComment && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <Badge variant="outline" className="text-xs">
                          Open for Comment
                        </Badge>
                      </div>
                    )}

                    {doc.commentEndDate && (
                      <div className="text-xs">
                        Comments close: {formatDate(doc.commentEndDate)}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(doc.url, '_blank')}
                  className="flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {results.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results found. Try adjusting your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
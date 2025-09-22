import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  FileText,
  Calendar,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { regulationsService } from '@/lib/regulations/regulationsService';
import { RegulationsSearch } from './RegulationsSearch';
import {
  ProcessedRegulationDocument,
  RegulationsGovDocument,
  INDUSTRY_PRESETS
} from '@/lib/regulations/types';

interface RegulationsDashboardProps {
  industryFocus?: keyof typeof INDUSTRY_PRESETS;
}

export const RegulationsDashboard: React.FC<RegulationsDashboardProps> = ({ industryFocus }) => {
  const { toast } = useToast();
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProcessedRegulationDocument | null>(null);

  const loadIntelligence = async () => {
    if (!industryFocus) return;
    
    try {
      const data = await regulationsService.getRegulatoryIntelligence(industryFocus, { days: 30 });
      setIntelligence(data);
    } catch (error) {
      console.error('Failed to load regulatory intelligence:', error);
      toast({
        title: "Load Error",
        description: "Failed to load regulatory intelligence data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await regulationsService.syncRecentDocuments();
      await loadIntelligence();
      toast({
        title: "Refresh Complete",
        description: result.message,
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: "Refresh Error",
        description: "Failed to refresh regulatory data.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIntelligence();
  }, [industryFocus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading regulatory intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regulatory Intelligence Dashboard</h1>
          {industryFocus && INDUSTRY_PRESETS[industryFocus] && (
            <p className="text-muted-foreground mt-1">
              {INDUSTRY_PRESETS[industryFocus].description}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="urgent">Urgent Items</TabsTrigger>
          <TabsTrigger value="comments">Comment Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {intelligence && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                        <p className="text-2xl font-bold">{intelligence.totalDocuments}</p>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Urgent Items</p>
                        <p className="text-2xl font-bold text-orange-600">{intelligence.urgentItems.length}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Open Comments</p>
                        <p className="text-2xl font-bold text-blue-600">{intelligence.openComments.length}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Top Agency</p>
                        <p className="text-lg font-bold">
                          {Object.entries(intelligence.byAgency).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Agency */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Documents by Agency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(intelligence.byAgency)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([agency, count]) => (
                          <div key={agency} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{agency}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-primary h-full"
                                  style={{ 
                                    width: `${((count as number) / Math.max(...Object.values(intelligence.byAgency) as number[])) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{count as number}</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>

                {/* By Document Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documents by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(intelligence.byType)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm">{type}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-primary h-full"
                                  style={{ 
                                    width: `${((count as number) / Math.max(...Object.values(intelligence.byType) as number[])) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{count as number}</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="search">
          <RegulationsSearch 
            industryFocus={industryFocus} 
            onResultSelect={setSelectedDocument}
          />
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          {intelligence?.urgentItems?.map((doc: ProcessedRegulationDocument) => (
            <UrgentDocumentCard 
              key={doc.id} 
              document={doc} 
              onSelect={() => setSelectedDocument(doc)}
            />
          )) || <div>No urgent items found.</div>}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {intelligence?.openComments?.map((doc: RegulationsGovDocument) => (
            <CommentPeriodCard key={doc.id} document={doc} />
          )) || <div>No open comment periods found.</div>}
        </TabsContent>
      </Tabs>

      {/* Document Detail Modal/Sidebar would go here */}
      {selectedDocument && (
        <DocumentDetailPanel 
          document={selectedDocument} 
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
};

// Helper Components
const UrgentDocumentCard: React.FC<{
  document: ProcessedRegulationDocument;
  onSelect: () => void;
}> = ({ document, onSelect }) => {
  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{document.agency}</Badge>
              <Badge className={getUrgencyColor(document.urgencyLevel)}>
                {document.urgencyLevel} - Score: {document.urgencyScore}
              </Badge>
              {document.isOpenForComment && (
                <Badge variant="outline" className="border-blue-500 text-blue-700">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Comment Period
                </Badge>
              )}
            </div>
            <h3 className="font-semibold leading-tight mb-2">{document.title}</h3>
            {document.summary && (
              <p className="text-muted-foreground text-sm line-clamp-2">{document.summary}</p>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {document.publishedDate.toLocaleDateString()}
            </div>
            {document.commentDeadline && (
              <div className="flex items-center gap-1 text-orange-600 mt-1">
                <Clock className="h-3 w-3" />
                {document.commentDeadline.toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

const CommentPeriodCard: React.FC<{
  document: RegulationsGovDocument;
}> = ({ document }) => {
  const daysLeft = document.attributes.commentEndDate 
    ? Math.ceil((new Date(document.attributes.commentEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{document.attributes.agencyId}</Badge>
              <Badge variant="outline">{document.attributes.documentType}</Badge>
              {daysLeft !== null && (
                <Badge 
                  variant={daysLeft <= 7 ? "destructive" : daysLeft <= 14 ? "default" : "secondary"}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {daysLeft} days left
                </Badge>
              )}
            </div>
            <h3 className="font-semibold leading-tight mb-2">{document.attributes.title}</h3>
            {document.attributes.summary && (
              <p className="text-muted-foreground text-sm line-clamp-2">{document.attributes.summary}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" asChild>
              <a 
                href={`https://www.regulations.gov/document/${document.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View & Comment
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

const DocumentDetailPanel: React.FC<{
  document: ProcessedRegulationDocument;
  onClose: () => void;
}> = ({ document, onClose }) => {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg p-6 overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Document Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">{document.title}</h3>
          <div className="space-y-2">
            <Badge variant="outline">{document.agency}</Badge>
            <Badge className="ml-2">{document.urgencyLevel}</Badge>
          </div>
        </div>
        
        {document.summary && (
          <div>
            <h4 className="font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">{document.summary}</p>
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-sm"><strong>Document Type:</strong> {document.documentType}</p>
          <p className="text-sm"><strong>Published:</strong> {document.publishedDate.toLocaleDateString()}</p>
          {document.commentDeadline && (
            <p className="text-sm"><strong>Comment Deadline:</strong> {document.commentDeadline.toLocaleDateString()}</p>
          )}
        </div>
        
        {document.tags.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1">
              {document.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
        
        <Button asChild className="w-full">
          <a href={document.externalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Regulations.gov
          </a>
        </Button>
      </div>
    </div>
  );
};
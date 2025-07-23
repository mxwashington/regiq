import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Loader2,
  AlertTriangle,
  Calendar,
  Building2
} from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  summary?: string;
  source: string;
  urgency?: number;
  published_date: string;
  external_url?: string;
}

interface PerplexityResult {
  content?: string;
  response?: string;
  sources?: Array<{ title: string; url: string }>;
  citations: string[];
  urgency_score: number;
  agencies_mentioned: string[];
}

interface EnhancedRecallCardProps {
  alert: Alert;
  onSaveAlert?: (alert: Alert) => void;
  savedAlerts?: Alert[];
}

export const EnhancedRecallCard: React.FC<EnhancedRecallCardProps> = ({ 
  alert, 
  onSaveAlert, 
  savedAlerts = [] 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [enhancedData, setEnhancedData] = useState<PerplexityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isSaved = savedAlerts.some(saved => saved.id === alert.id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 8) return 'bg-red-500';
    if (urgency >= 6) return 'bg-orange-500';
    if (urgency >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleEnhanceWithPerplexity = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use enhanced recall research.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create a focused query for recall research
      const query = `${alert.title} ${alert.summary || ''} recall details official sources FDA USDA EPA`.trim();
      
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: {
          query,
          agencies: ['FDA', 'USDA', 'EPA', 'CDC', 'FSIS'],
          searchType: 'recalls',
          industry: 'Food Safety',
          timeRange: 'month'
        }
      });

      if (error) throw error;

      setEnhancedData(data);
      setHasSearched(true);
      setIsExpanded(true);

      toast({
        title: "Recall Enhanced",
        description: "Found additional sources and details for this recall.",
      });

    } catch (error) {
      console.error('Error enhancing recall:', error);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance this recall. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (onSaveAlert) {
      onSaveAlert(alert);
      toast({
        title: isSaved ? "Alert Removed" : "Alert Saved",
        description: isSaved ? "Alert removed from saved items" : "Alert saved for later review",
      });
    }
  };

  return (
    <Card className="mb-4 border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between space-x-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 leading-tight">
              {alert.title}
            </CardTitle>
            {alert.summary && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {alert.summary}
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {alert.urgency && (
              <Badge 
                variant="secondary" 
                className={`${getUrgencyColor(alert.urgency)} text-white px-2 py-1`}
              >
                {alert.urgency}/10
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Building2 className="w-3 h-3 mr-1" />
              {alert.source}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(alert.published_date)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnhanceWithPerplexity}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Search className="w-3 h-3 mr-1" />
              )}
              Enhance with AI
            </Button>

            {alert.external_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={alert.external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Original
                </a>
              </Button>
            )}

            {onSaveAlert && (
              <Button
                variant={isSaved ? "secondary" : "outline"}
                size="sm"
                onClick={handleSave}
              >
                {isSaved ? "Saved" : "Save"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {(enhancedData || hasSearched) && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <span className="font-medium">Enhanced Recall Details</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 border-t">
              {enhancedData ? (
                <div className="space-y-6">
                  {/* Enhanced Content */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                      Detailed Recall Information
                    </h4>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {enhancedData.content || enhancedData.response || ''}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Enhanced Sources */}
                  {(enhancedData.sources?.length > 0 || enhancedData.citations?.length > 0) && (
                    <div>
                      <h4 className="font-medium mb-3">Official Sources & Documentation</h4>
                      <div className="space-y-2">
                        {enhancedData.sources?.map((source, index) => (
                          <div key={`source-${index}`} className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-blue-900">{source.title}</div>
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline break-all"
                              >
                                {source.url}
                              </a>
                            </div>
                          </div>
                        ))}
                        {!enhancedData.sources?.length && enhancedData.citations?.map((citation, index) => (
                          <div key={`citation-${index}`} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
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

                  {/* Agencies Mentioned */}
                  {enhancedData.agencies_mentioned?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Regulatory Agencies Involved</h4>
                      <div className="flex flex-wrap gap-2">
                        {enhancedData.agencies_mentioned.map((agency, index) => (
                          <Badge key={index} variant="outline">
                            {agency}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Urgency Score */}
                  {enhancedData.urgency_score && (
                    <div>
                      <h4 className="font-medium mb-2">AI Risk Assessment</h4>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getUrgencyColor(enhancedData.urgency_score)}`}></div>
                        <span className="text-sm">
                          Risk Level: {enhancedData.urgency_score}/10
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : hasSearched ? (
                <div className="text-center text-gray-500 py-4">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No additional information found for this recall.</p>
                </div>
              ) : null}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
};

export default EnhancedRecallCard;
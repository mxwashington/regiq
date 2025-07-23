import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileButton } from './MobileButton';
import { 
  ExternalLink, 
  Share2, 
  X, 
  Clock, 
  Search, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Building2,
  Bot,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  title: string;
  summary?: string;
  source: string;
  urgency?: string;
  published_date: string;
  external_url?: string;
  full_content?: string;
  region?: string;
  agency?: string;
}

interface PerplexityResult {
  content?: string;
  response?: string;
  sources?: Array<{ title: string; url: string }>;
  citations: string[];
  urgency_score: number;
  agencies_mentioned: string[];
  timestamp: string;
  cached?: boolean;
}

interface PerplexityAlertCardProps {
  alert: Alert;
  onDismissAlert?: (alertId: string) => void;
  onSaveAlert?: (alert: Alert) => void;
  savedAlerts?: Alert[];
  showEnhancedDetails?: boolean;
}

export const PerplexityAlertCard: React.FC<PerplexityAlertCardProps> = ({ 
  alert, 
  onDismissAlert, 
  onSaveAlert,
  savedAlerts = [],
  showEnhancedDetails = true
}) => {
  const [enhancedData, setEnhancedData] = useState<PerplexityResult | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-expand when enhanced data is available
  React.useEffect(() => {
    if (enhancedData && !isDismissed) {
      setIsExpanded(true);
    }
  }, [enhancedData, isDismissed]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isSaved = savedAlerts.some(saved => saved.id === alert.id);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    if (!urgency) return 'bg-gray-500';
    switch (urgency.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-orange-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUrgencyIcon = (urgency?: string) => {
    if (!urgency) return null;
    switch (urgency.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handlePerplexitySearch = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use AI-powered source enhancement.",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);
    try {
      // Create a focused query for the alert
      const query = `${alert.title} ${alert.summary || ''} ${alert.source} regulatory compliance details sources`.trim();
      
      // Determine search type based on content
      let searchType = 'general';
      const content = `${alert.title} ${alert.summary || ''}`.toLowerCase();
      if (content.includes('recall')) searchType = 'recalls';
      else if (content.includes('deadline') || content.includes('compliance')) searchType = 'deadlines';
      else if (content.includes('guidance') || content.includes('rule')) searchType = 'guidance';

      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: {
          query,
          agencies: [alert.source, alert.agency].filter(Boolean),
          searchType,
          industry: 'Regulatory Compliance',
          timeRange: 'month'
        }
      });

      if (error) throw error;

      setEnhancedData(data);
      setHasSearched(true);
      setIsExpanded(true); // Always expand when new data is loaded
      setIsDismissed(false); // Reset dismiss state when new data is loaded

      // Debug: Log the response to understand what we're getting
      console.log('Perplexity response data:', JSON.stringify(data, null, 2));

      // Update alert's external URL if we found a better source
      if (data?.sources?.length > 0) {
        const bestSource = data.sources[0]; // First source is typically the best
        const newUrl = bestSource.url;
        
        // Only update if we don't have an external URL or found a better one
        if (!alert.external_url || (newUrl && newUrl !== alert.external_url)) {
          try {
            const { error: updateError } = await supabase
              .from('alerts')
              .update({ external_url: newUrl })
              .eq('id', alert.id);

            if (!updateError) {
              // Update local alert object
              alert.external_url = newUrl;
              
              toast({
                title: "Source Updated",
                description: "Alert source link has been updated with the best available URL.",
              });
            } else {
              console.error('Failed to update alert URL:', updateError);
            }
          } catch (updateError) {
            console.error('Error updating alert URL:', updateError);
          }
        }
      }

      toast({
        title: "Sources Enhanced",
        description: "Found additional regulatory sources and context.",
      });

    } catch (error) {
      console.error('Error enhancing alert:', error);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance this alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: alert.title,
      text: alert.summary || alert.title,
      url: alert.external_url || window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${alert.title}\n${alert.summary || ''}\n${alert.external_url || window.location.href}`
        );
        toast({
          title: "Copied to clipboard",
          description: "Alert details copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDismiss = () => {
    if (onDismissAlert) {
      onDismissAlert(alert.id);
      toast({
        title: "Alert dismissed",
        description: "Alert has been hidden from your feed",
      });
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

  const handleExternalLink = () => {
    if (alert.external_url && alert.external_url.trim() && alert.external_url.startsWith('http')) {
      window.open(alert.external_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Source Unavailable",
        description: "No valid source URL available for this alert.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`border border-gray-200 hover:shadow-md transition-shadow ${isMobile ? 'mx-2' : ''}`}>
      <CardHeader className={isMobile ? "px-3 py-3" : "pb-3"}>
        <div className="flex items-start justify-between space-x-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-gray-900 leading-tight ${isMobile ? 'text-sm' : 'text-base'}`}>
              {alert.title}
            </h3>
            <div className={`flex items-center gap-2 text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              <span className="flex items-center gap-1">
                <Clock className={isMobile ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {formatDate(alert.published_date)}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className={isMobile ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {alert.source}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {alert.urgency && (
              <Badge 
                variant="secondary" 
                className={`${getUrgencyColor(alert.urgency)} text-white px-2 py-1 text-xs`}
              >
                <span className="flex items-center gap-1">
                  {getUrgencyIcon(alert.urgency)}
                  {alert.urgency}
                </span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "pt-0 px-3 pb-3" : "pt-0"}>
        {alert.summary && (
          <p className={`text-muted-foreground mb-3 ${isMobile ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
            {alert.summary}
          </p>
        )}

        {/* Actions */}
        <div className={`flex items-center ${isMobile ? 'justify-end' : 'justify-between'} mb-3`}>
          {!isMobile && (
            <div className="text-xs text-muted-foreground">
              Real-time regulatory alert
            </div>
          )}
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            <MobileButton
              onClick={handlePerplexitySearch}
              disabled={isEnhancing}
              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isEnhancing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Bot className="h-3 w-3" />
              )}
              <span className={isMobile ? 'text-xs' : 'text-xs'}>
                {isEnhancing ? 'Enhancing...' : 'AI Sources'}
              </span>
            </MobileButton>
            
            {alert.external_url && alert.external_url.trim() && alert.external_url.startsWith('http') && (
              <MobileButton
                onClick={handleExternalLink}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                <span className={isMobile ? 'hidden' : 'text-xs'}>Original</span>
              </MobileButton>
            )}
            
            <MobileButton
              onClick={handleShare}
              className="flex items-center gap-1"
            >
              <Share2 className="h-3 w-3" />
              <span className={isMobile ? 'hidden' : 'text-xs'}>Share</span>
            </MobileButton>
            
            {onSaveAlert && (
              <MobileButton
                onClick={handleSave}
                className={`flex items-center gap-1 ${isSaved ? 'bg-blue-600 text-white' : ''}`}
              >
                <span className="text-xs">{isSaved ? 'Saved' : 'Save'}</span>
              </MobileButton>
            )}
            
            {onDismissAlert && (
              <MobileButton
                onClick={handleDismiss}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
              </MobileButton>
            )}
          </div>
        </div>

        {/* Enhanced Details Section */}
        {showEnhancedDetails && (enhancedData || hasSearched) && !isDismissed && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center w-full">
                <Button 
                  variant="ghost" 
                  className="flex-1 justify-between p-2 h-auto border border-purple-200 bg-purple-50 hover:bg-purple-100"
                >
                  <span className="font-medium text-purple-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI-Enhanced Details
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDismissed(true);
                    setIsExpanded(false);
                    toast({
                      title: "AI Sources Dismissed",
                      description: "Click 'AI Sources' to view enhanced details again.",
                    });
                  }}
                  className="ml-2 h-8 w-8 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-3 p-3 border border-purple-200 rounded-lg bg-purple-50/50">
                {enhancedData ? (
                  <div className="space-y-4">
                    {/* Enhanced Content */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center text-purple-800">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Detailed Analysis
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
                        <h4 className="font-medium mb-2 text-purple-800">Official Sources</h4>
                        <div className="space-y-2">
                          {enhancedData.sources?.map((source, index) => (
                            <a
                              key={`source-${index}`}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 hover:border-blue-300 transition-colors cursor-pointer group"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0 group-hover:text-blue-700" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-blue-900 group-hover:text-blue-800 truncate">
                                  {source.title}
                                </div>
                                <div className="text-xs text-blue-600 group-hover:text-blue-700 truncate mt-1">
                                  {source.url.replace(/^https?:\/\//, '')}
                                </div>
                              </div>
                              <div className="text-blue-600 group-hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs">Open</span>
                              </div>
                            </a>
                          ))}
                          {!enhancedData.sources?.length && enhancedData.citations?.map((citation, index) => (
                            <a
                              key={`citation-${index}`}
                              href={citation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:text-gray-700" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-700 group-hover:text-gray-800 truncate">
                                  {citation.replace(/^https?:\/\//, '')}
                                </div>
                              </div>
                              <div className="text-gray-600 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs">Open</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agencies and Risk Score */}
                    <div className="flex justify-between items-center">
                      {enhancedData.agencies_mentioned?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-xs text-purple-800 mb-1">Agencies</h4>
                          <div className="flex flex-wrap gap-1">
                            {enhancedData.agencies_mentioned.map((agency, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {agency}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {enhancedData.urgency_score && (
                        <div className="text-right">
                          <h4 className="font-medium text-xs text-purple-800 mb-1">AI Risk Score</h4>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getUrgencyColor(enhancedData.urgency_score >= 8 ? 'high' : enhancedData.urgency_score >= 6 ? 'medium' : 'low')}`}></div>
                            <span className="text-xs font-medium">{enhancedData.urgency_score}/10</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {enhancedData.cached && (
                      <div className="text-xs text-gray-500 text-center">
                        Results cached for faster loading
                      </div>
                    )}
                  </div>
                ) : hasSearched ? (
                  <div className="text-center text-gray-500 py-4">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs">No additional information found for this alert.</p>
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

export default PerplexityAlertCard;
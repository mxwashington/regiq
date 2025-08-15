import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileButton } from './MobileButton';
import { 
  Search, 
  Globe, 
  ExternalLink, 
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Bot,
  Sparkles,
  Building2,
  Clock,
  X
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { searchForAlert, generateSearchQueries, extractKeywords } from '@/lib/alert-search';
import { formatDistanceToNow } from 'date-fns';

interface AlertSourceSearchDemoProps {
  alert: {
    title: string;
    source: string;
    external_url?: string;
    published_date?: string;
    summary?: string;
    urgency?: string;
  };
}

export const AlertSourceSearchDemo = ({ alert }: AlertSourceSearchDemoProps) => {
  const [showQueries, setShowQueries] = useState(false);
  const [queries, setQueries] = useState<{
    primary: string;
    secondary: string;
    fallback: string;
    broad: string;
  } | null>(null);
  const [isLoadingQueries, setIsLoadingQueries] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  const isMobile = useIsMobile();
  const keywords = extractKeywords(alert.title);
  const hasValidUrl = alert.external_url && alert.external_url.trim() !== '';

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
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

  const loadQueries = async () => {
    if (queries) return; // Already loaded
    
    setIsLoadingQueries(true);
    try {
      const generatedQueries = await generateSearchQueries(alert.title, alert.source);
      setQueries(generatedQueries);
    } catch (error) {
      console.error('Failed to generate queries:', error);
      // Fallback to basic queries
      const config = { domain: 'gov', additionalTerms: ['alert'] };
      setQueries({
        primary: `${keywords} site:${config.domain}`,
        secondary: `${keywords} alert site:${config.domain}`,
        fallback: `${keywords} ${alert.source} alert`,
        broad: `"${alert.title}" ${alert.source} site:${config.domain}`
      });
    } finally {
      setIsLoadingQueries(false);
    }
  };

  React.useEffect(() => {
    loadQueries();
  }, [alert.title, alert.source]);

  const searchOptions = queries ? [
    {
      type: 'primary' as const,
      label: `Smart Search ${alert.source}`,
      description: 'GPT-enhanced keywords',
      icon: Target,
      query: queries.primary
    },
    {
      type: 'secondary' as const,
      label: 'Enhanced Search',
      description: 'AI + agency terms',
      icon: Search,
      query: queries.secondary
    },
    {
      type: 'fallback' as const,
      label: 'Broader Search',
      description: 'All sites with agency',
      icon: Globe,
      query: queries.fallback
    },
    {
      type: 'broad' as const,
      label: 'General Search',
      description: 'Widest search scope',
      icon: Zap,
      query: queries.broad
    }
  ] : [];

  if (isDismissed) return null;

  return (
    <Card className={`mobile-container-safe mobile-card-content border border-blue-200 hover:shadow-md transition-shadow bg-blue-50/30 ${isMobile ? 'mx-2 p-4' : ''}`}>
      <CardHeader className={isMobile ? "px-3 py-3" : "pb-3"}>
        <div className="flex items-start justify-between space-x-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-blue-900 leading-tight mobile-text-content alert-title break-words-mobile ${isMobile ? 'text-sm' : 'text-base'}`}>
              {alert.title}
            </h3>
            <div className={`flex items-center gap-2 text-blue-700 mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              {alert.published_date && (
                <span className="flex items-center gap-1">
                  <Clock className={isMobile ? "h-2.5 w-2.5" : "h-3 w-3"} />
                  {formatDate(alert.published_date)}
                </span>
              )}
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
                {alert.urgency}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "pt-0 px-3 pb-3" : "pt-0"}>
        {alert.summary && (
          <p className={`text-blue-800 mb-3 mobile-text-content break-words-mobile ${isMobile ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
            {alert.summary}
          </p>
        )}

        <div className="mb-3 p-3 bg-blue-100 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Enhanced Source Search Demo
          </div>
          <div className="text-xs text-blue-800 space-y-1">
            <div><strong>Search Status:</strong> {hasValidUrl ? '✅ Source Available' : '❌ Missing Source'}</div>
            <div><strong>Keywords:</strong> <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-800 break-words-mobile mobile-text-content">{keywords}</Badge></div>
          </div>
        </div>

        {/* Actions */}
        <div className={`flex items-center flex-wrap gap-2 ${isMobile ? 'justify-between' : 'justify-between'} mb-3`}>
          {!isMobile && (
            <div className="text-xs text-blue-700">
              Enhanced source discovery demo
            </div>
          )}
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {hasValidUrl ? (
              <MobileButton
                onClick={() => window.open(alert.external_url, '_blank', 'noopener,noreferrer')}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                <span className={isMobile ? 'text-xs' : 'text-xs'}>Original</span>
              </MobileButton>
            ) : (
              <MobileButton
                disabled
                className="flex items-center gap-1 bg-gray-400 text-white cursor-not-allowed shrink-0"
              >
                <Search className="h-3 w-3" />
                <span className={isMobile ? 'text-xs' : 'text-xs'}>No Source</span>
              </MobileButton>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <MobileButton className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white shrink-0">
                  <Globe className="w-3 h-3" />
                  <span className={isMobile ? 'text-xs' : 'text-xs'}>Find Sources</span>
                  <ChevronDown className="w-2 h-2" />
                </MobileButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 z-50 bg-popover text-foreground border border-border shadow-md">
                {searchOptions.map((option, index) => (
                  <DropdownMenuItem 
                    key={option.type}
                    onClick={() => searchForAlert(alert.title, alert.source, option.type)}
                    className="flex items-start gap-3 py-3"
                  >
                    <option.icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Enhanced Details Section */}
        <Collapsible open={showQueries} onOpenChange={setShowQueries}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center w-full">
              <Button 
                variant="ghost" 
                className="flex-1 justify-between p-2 h-auto border border-blue-200 bg-blue-100 hover:bg-blue-200"
              >
                <span className="font-medium text-blue-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Search Analysis & Queries
                </span>
                {showQueries ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50/50">
              <div className="space-y-4">
                {/* Keyword Analysis */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center text-blue-800">
                    <Target className="w-4 h-4 mr-2" />
                    Keyword Extraction
                  </h4>
                  <div className="text-xs bg-blue-100 p-3 rounded border border-blue-300">
                    <div className="space-y-1">
                      <div><span className="font-medium">Original Title:</span> {alert.title}</div>
                      <div><span className="font-medium">Extracted Keywords:</span> <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-800">{keywords}</Badge></div>
                      <div className="text-blue-600">✨ Noise words removed for better search targeting</div>
                    </div>
                  </div>
                </div>

                {/* Search Queries */}
                <div>
                  <h4 className="font-medium mb-2 text-blue-800">Generated Search Queries</h4>
                  <div className="space-y-2">
                    {searchOptions.map((option) => (
                      <div key={option.type} className="p-3 bg-blue-100 hover:bg-blue-200 rounded border border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <option.icon className="w-4 h-4 text-blue-600" />
                            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-400 text-blue-800">{option.label}</Badge>
                          </div>
                          <span className="text-xs text-blue-600">{option.description}</span>
                        </div>
                        <div className="font-mono text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200 break-all">
                          {option.query}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
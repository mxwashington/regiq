import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Globe, 
  ExternalLink, 
  ChevronDown,
  Target,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { searchForAlert, generateSearchQueries, extractKeywords } from '@/lib/alert-search';

interface AlertSourceSearchDemoProps {
  alert: {
    title: string;
    source: string;
    external_url?: string;
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
  
  const keywords = extractKeywords(alert.title);
  const hasValidUrl = alert.external_url && alert.external_url.trim() !== '';

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

  return (
    <Card className="border-dashed border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-lg">Alert Source Search Demo</CardTitle>
        <CardDescription>
          Enhanced source finding with multiple search strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-1">
          <div><strong>Alert:</strong> {alert.title.substring(0, 80)}...</div>
          <div><strong>Agency:</strong> {alert.source}</div>
          <div><strong>Has URL:</strong> {hasValidUrl ? '✅ Yes' : '❌ No'}</div>
          <div><strong>Extracted Keywords:</strong> <Badge variant="secondary" className="text-xs">{keywords}</Badge></div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasValidUrl ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={alert.external_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Read Full Alert
                </a>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Search Web
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
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
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Find Source
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
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
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowQueries(!showQueries)}
            className="flex items-center gap-2"
          >
            <ArrowRight className={`w-3 h-3 transition-transform ${showQueries ? 'rotate-90' : ''}`} />
            {showQueries ? 'Hide' : 'Show'} Queries
          </Button>
        </div>

        {showQueries && (
          <div className="space-y-3 pt-2 border-t">
            <div className="text-sm font-medium">Search Analysis:</div>
            <div className="text-xs bg-blue-50 p-3 rounded border">
              <div className="font-medium text-blue-800 mb-2">Keyword Extraction</div>
              <div className="space-y-1">
                <div><span className="font-medium">Original Title:</span> {alert.title}</div>
                <div><span className="font-medium">Extracted Keywords:</span> <Badge variant="outline" className="text-xs">{keywords}</Badge></div>
                <div className="text-muted-foreground">✨ Noise words removed for better search targeting</div>
              </div>
            </div>
            <div className="text-sm font-medium">Generated Search Queries:</div>
            {searchOptions.map((option) => (
              <div key={option.type} className="text-xs bg-muted p-2 rounded">
                <Badge variant="outline" className="text-xs mb-1">{option.label}</Badge>
                <div className="font-mono text-muted-foreground break-all">
                  {option.query}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
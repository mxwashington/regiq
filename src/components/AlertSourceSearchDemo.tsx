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
import { searchForAlert, generateSearchQueries } from '@/lib/alert-search';

interface AlertSourceSearchDemoProps {
  alert: {
    title: string;
    source: string;
    external_url?: string;
  };
}

export const AlertSourceSearchDemo = ({ alert }: AlertSourceSearchDemoProps) => {
  const [showQueries, setShowQueries] = useState(false);
  
  const queries = generateSearchQueries(alert.title, alert.source);
  const hasValidUrl = alert.external_url && alert.external_url.trim() !== '';

  const searchOptions = [
    {
      type: 'primary' as const,
      label: `Search ${alert.source} site`,
      description: 'Most targeted search',
      icon: Target,
      query: queries.primary
    },
    {
      type: 'secondary' as const,
      label: 'Search with keywords',
      description: 'Agency site + relevant terms',
      icon: Search,
      query: queries.secondary
    },
    {
      type: 'fallback' as const,
      label: 'Broader search',
      description: 'All sites with agency name',
      icon: Globe,
      query: queries.fallback
    },
    {
      type: 'broad' as const,
      label: 'General search',
      description: 'Widest search scope',
      icon: Zap,
      query: queries.broad
    }
  ];

  return (
    <Card className="border-dashed border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-lg">Alert Source Search Demo</CardTitle>
        <CardDescription>
          Enhanced source finding with multiple search strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <strong>Alert:</strong> {alert.title.substring(0, 80)}...
          <br />
          <strong>Agency:</strong> {alert.source}
          <br />
          <strong>Has URL:</strong> {hasValidUrl ? '✅ Yes' : '❌ No'}
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
          <div className="space-y-2 pt-2 border-t">
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
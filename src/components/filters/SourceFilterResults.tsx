import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { SourceResult, NormalizedResult } from '@/types/filter-engine';
import { formatDistanceToNow } from 'date-fns';

interface SourceFilterResultsProps {
  results: SourceResult[];
  loading: boolean;
  error?: string | null;
  totalResults: number;
  executionTime: number;
  cacheStats: { hits: number; misses: number };
  onRetry?: () => void;
}

export const SourceFilterResults: React.FC<SourceFilterResultsProps> = ({
  results,
  loading,
  error,
  totalResults,
  executionTime,
  cacheStats,
  onRetry
}) => {
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-muted-foreground">Searching regulatory sources...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Query Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Total Results</p>
              <p className="font-semibold">{totalResults}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Execution Time</p>
              <p className="font-semibold">{executionTime}ms</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Cache Hits</p>
              <p className="font-semibold">{cacheStats.hits}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Sources</p>
              <p className="font-semibold">{successfulResults.length}/{results.length}</p>
            </div>
          </div>
          
          {failedResults.length > 0 && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {failedResults.length} source(s) failed: {failedResults.map(r => r.source).join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Source Results */}
      {successfulResults.map((sourceResult) => (
        <Card key={sourceResult.source}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {sourceResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                {sourceResult.source}
                {sourceResult.cache_info?.hit && (
                  <Badge variant="secondary" className="text-xs">
                    Cached
                  </Badge>
                )}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {sourceResult.data.length} results
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {sourceResult.success ? (
              <div className="space-y-4">
                {sourceResult.data.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No results found for this source with current filters
                  </p>
                ) : (
                  sourceResult.data.map((item) => (
                    <ResultItem key={item.id} result={item} />
                  ))
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {sourceResult.error || 'Unknown error occurred'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {totalResults === 0 && successfulResults.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              No regulatory alerts match your current filter criteria. 
              Try adjusting your filters or expanding the date range.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ResultItem: React.FC<{ result: NormalizedResult }> = ({ result }) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';  
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold line-clamp-2 mb-1">{result.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {result.summary}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {result.source}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${getUrgencyColor(result.urgency)}`} />
            <span>{result.urgency}</span>
            <Clock className="h-3 w-3 ml-2" />
            <span>{formatDistanceToNow(new Date(result.published_date), { addSuffix: true })}</span>
          </div>
        </div>
        
        {result.external_url && (
          <Button variant="ghost" size="sm" asChild>
            <a 
              href={result.external_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
      
      {result.metadata && Object.keys(result.metadata).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View Details
          </summary>
          <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
            {Object.entries(result.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
                <span className="text-right max-w-xs truncate">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
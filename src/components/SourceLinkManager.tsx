import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Search, Link, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { DataScraperTrigger } from './DataScraperTrigger';

interface SourceResult {
  id: string;
  title: string;
  old_url?: string;
  new_url: string;
  confidence: number;
  method: string;
}

interface ScrapingStatus {
  processed: number;
  updated: number;
  results: SourceResult[];
  message: string;
}

export const SourceLinkManager = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<ScrapingStatus | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<any>(null);
  const { toast } = useToast();

  const runSourceFinder = async () => {
    setIsRunning(true);
    setStatus(null);
    
    try {
      toast({
        title: 'Finding Source Links',
        description: 'Starting enhanced source finding for alerts...',
      });

      const { data, error } = await supabase.functions.invoke('alert-source-finder');
      
      if (error) {
        throw error;
      }

      setStatus(data);
      
      toast({
        title: 'Source Finding Complete',
        description: `Enhanced ${data.updated} alerts with source links`,
      });
    } catch (error: any) {
      console.error('Error running source finder:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to find source links',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runWebScraper = async (agency?: string) => {
    setIsRunning(true);
    setScrapingStatus(null);
    
    try {
      toast({
        title: 'Web Scraping Started',
        description: agency ? `Scraping ${agency} sources...` : 'Scraping all agency sources...',
      });

      const params = new URLSearchParams();
      if (agency) params.append('agency', agency);

      const { data, error } = await supabase.functions.invoke(
        'government-web-scraper', 
        { 
          body: {},
          headers: agency ? { 'X-Agency': agency } : {}
        }
      );
      
      if (error) {
        throw error;
      }

      setScrapingStatus(data);
      
      toast({
        title: 'Web Scraping Complete',
        description: `Scraped ${data.total_items} items from ${data.successful_scrapes} sources`,
      });
    } catch (error: any) {
      console.error('Error running web scraper:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to scrape sources',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getMethodBadge = (method: string) => {
    const methodColors: Record<string, string> = {
      'cached_scraped_exact': 'bg-green-100 text-green-800',
      'cached_scraped_fuzzy': 'bg-blue-100 text-blue-800',
      'fuzzy_scraped_match': 'bg-purple-100 text-purple-800',
      'date_based_match': 'bg-orange-100 text-orange-800',
      'government_site_search': 'bg-indigo-100 text-indigo-800',
      'content_extraction': 'bg-yellow-100 text-yellow-800',
      'pattern_construction': 'bg-gray-100 text-gray-800',
    };
    
    return methodColors[method] || 'bg-gray-100 text-gray-800';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <Clock className="w-4 h-4 text-orange-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Runner */}
      <DataScraperTrigger />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Source Link Management
          </CardTitle>
          <CardDescription>
            Manage source links for regulatory alerts using web scraping and AI matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => runWebScraper()}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Scrape All Agencies
            </Button>
            
            <Button
              onClick={() => runWebScraper('FDA')}
              disabled={isRunning}
              variant="outline"
            >
              Scrape FDA
            </Button>
            
            <Button
              onClick={() => runWebScraper('USDA')}
              disabled={isRunning}
              variant="outline"
            >
              Scrape USDA
            </Button>
            
            <Button
              onClick={() => runWebScraper('EPA')}
              disabled={isRunning}
              variant="outline"
            >
              Scrape EPA
            </Button>
            
            <Button
              onClick={runSourceFinder}
              disabled={isRunning}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Link className="w-4 h-4" />
              )}
              Find Source Links
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scraping Status */}
      {scrapingStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Web Scraping Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {scrapingStatus.total_targets}
                </div>
                <div className="text-sm text-muted-foreground">Total Targets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {scrapingStatus.successful_scrapes}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {scrapingStatus.failed_scrapes}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {scrapingStatus.total_items}
                </div>
                <div className="text-sm text-muted-foreground">Items Found</div>
              </div>
            </div>
            
            {scrapingStatus.results && scrapingStatus.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Scraping Details:</h4>
                {scrapingStatus.results.map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <span className="font-medium">{result.target_id}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {result.items_found} items found
                      </span>
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Source Finding Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle>Source Link Results</CardTitle>
            <CardDescription>
              Processed {status.processed} alerts, enhanced {status.updated} with source links
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.results.length > 0 ? (
              <div className="space-y-4">
                {status.results.map((result) => (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium line-clamp-2 mb-2">
                          {result.title}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          {getConfidenceIcon(result.confidence)}
                          <span className="text-sm font-medium">
                            {(result.confidence * 100).toFixed(0)}% confidence
                          </span>
                          <Badge className={getMethodBadge(result.method)}>
                            {result.method.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          {result.old_url && (
                            <div className="text-muted-foreground">
                              Old: <span className="font-mono">{result.old_url}</span>
                            </div>
                          )}
                          <div className="text-primary">
                            New: <a 
                              href={result.new_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-mono hover:underline"
                            >
                              {result.new_url}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No source links found or updated.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
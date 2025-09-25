import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { logger } from '@/lib/logger';

export const DataScraperTrigger = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runFullScraping = async () => {
    setIsRunning(true);
    setProgress('');
    setResults(null);
    
    try {
      // Step 1: Run web scraping
      setProgress('Step 1/2: Running web scraper for all agencies...');
      toast({
        title: 'Starting Data Collection',
        description: 'Running web scraper for all agencies...',
      });

      const { data: scrapingData, error: scrapingError } = await supabase.functions.invoke('government-web-scraper');
      
      if (scrapingError) {
        throw new Error(`Web scraping failed: ${scrapingError.message}`);
      }

      logger.debug('Web scraping completed', scrapingData, 'DataScraperTrigger');
      
      // Step 2: Wait for cache to populate
      setProgress('Waiting for data to be cached...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 3: Run source finder
      setProgress('Step 2/2: Finding source links for alerts...');
      toast({
        title: 'Finding Source Links',
        description: 'Matching alerts with scraped source links...',
      });

      const { data: sourceData, error: sourceError } = await supabase.functions.invoke('alert-source-finder');
      
      if (sourceError) {
        throw new Error(`Source finding failed: ${sourceError.message}`);
      }

      logger.debug('Source finding completed', sourceData, 'DataScraperTrigger');
      
      setResults({
        scraping: scrapingData,
        sourceFinding: sourceData
      });
      
      toast({
        title: 'Data Collection Complete',
        description: `Scraped ${scrapingData.total_items || 0} items, enhanced ${sourceData.updated || 0} alerts with source links`,
      });
      
      setProgress('✅ Complete! Data has been updated.');
      
    } catch (error: any) {
      logger.error('Error running data collection', error, 'DataScraperTrigger');
      toast({
        title: 'Error',
        description: error.message || 'Failed to collect data',
        variant: 'destructive',
      });
      setProgress(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Data Collection Runner
        </CardTitle>
        <CardDescription>
          Run the complete data collection pipeline to scrape agency websites and find source links
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runFullScraping}
          disabled={isRunning}
          className="flex items-center gap-2"
          size="lg"
        >
          {isRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? 'Running...' : 'Run Complete Data Collection'}
        </Button>
        
        {progress && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{progress}</p>
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {results.scraping?.total_items || 0}
                </div>
                <div className="text-sm text-muted-foreground">Items Scraped</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.sourceFinding?.updated || 0}
                </div>
                <div className="text-sm text-muted-foreground">Links Added</div>
              </div>
            </div>
            
            {results.sourceFinding?.results && results.sourceFinding.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Recent Updates:</h4>
                {results.sourceFinding.results.slice(0, 5).map((result: any, index: number) => (
                  <div key={index} className="p-2 bg-muted/50 rounded text-sm">
                    <div className="font-medium line-clamp-1">{result.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(result.confidence * 100).toFixed(0)}% • Method: {result.method}
                    </div>
                    <div className="text-xs">
                      <a href={result.new_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {result.new_url}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
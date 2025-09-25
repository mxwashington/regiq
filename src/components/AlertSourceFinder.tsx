import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface SourceFinderResult {
  processed: number;
  updated: number;
  updatedAlerts: Array<{
    id: string;
    title: string;
    sourceUrl: string;
  }>;
}

export const AlertSourceFinder = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<SourceFinderResult | null>(null);
  const { toast } = useToast();

  const findSources = async () => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      logger.debug('Invoking alert-source-finder function', undefined, 'AlertSourceFinder');
      const { data, error } = await supabase.functions.invoke('alert-source-finder');

      if (error) {
        throw error;
      }

      setLastResult(data);
      
      toast({
        title: "Source Finding Complete",
        description: `Processed ${data.processed} alerts, found sources for ${data.updated}`,
        duration: 5000,
      });

    } catch (error) {
      logger.error('Error finding sources', error, 'AlertSourceFinder');
      toast({
        title: "Error",
        description: "Failed to find alert sources. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Alert Source Finder
        </CardTitle>
        <CardDescription>
          Automatically find and add sources for alerts that are missing external URLs using web scraping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={findSources} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finding Sources...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Find Missing Sources
            </>
          )}
        </Button>

        {lastResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Processed: {lastResult.processed}
              </Badge>
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Updated: {lastResult.updated}
              </Badge>
            </div>

            {lastResult.updatedAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Updated Alerts:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lastResult.updatedAlerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-2 bg-muted/50 rounded text-xs space-y-1"
                    >
                      <div className="font-medium truncate">{alert.title}</div>
                      <a 
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {alert.sourceUrl}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>This feature searches for government sources (FDA, USDA, EPA, etc.) for alerts missing external URLs.</p>
          <p className="mt-1">Processing is done in batches to avoid rate limiting.</p>
        </div>
      </CardContent>
    </Card>
  );
};
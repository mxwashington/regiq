import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

export const TestDataRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runTest = async () => {
    setIsRunning(true);
    
    try {
      console.log('Starting test run...');
      toast({
        title: 'Running Test',
        description: 'Testing data collection system...',
      });

      // First run the web scraper
      console.log('Running web scraper...');
      const { data: scrapingResult, error: scrapingError } = await supabase.functions.invoke('government-web-scraper');
      
      if (scrapingError) {
        console.error('Scraping error:', scrapingError);
        throw scrapingError;
      }
      
      console.log('Scraping result:', scrapingResult);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Then run the source finder
      console.log('Running source finder...');
      const { data: sourceResult, error: sourceError } = await supabase.functions.invoke('alert-source-finder');
      
      if (sourceError) {
        console.error('Source finding error:', sourceError);
        throw sourceError;
      }
      
      console.log('Source result:', sourceResult);
      
      toast({
        title: 'Test Complete',
        description: `Updated ${sourceResult.updated || 0} alerts with source links`,
      });
      
    } catch (error: any) {
      console.error('Test error:', error);
      toast({
        title: 'Test Failed',
        description: error.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-dashed border-orange-300 bg-orange-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-orange-800">Test Data Collection</h3>
            <p className="text-sm text-orange-600">Run scrapers and source finder</p>
          </div>
          <Button
            onClick={runTest}
            disabled={isRunning}
            variant="outline"
            size="sm"
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'Run Test'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
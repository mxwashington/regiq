import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { triggerSpecificAgencyPipeline } from '@/lib/trigger-pipeline';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function TestRegulationsGov() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const { toast } = useToast();

  const testRegulationsGovAPI = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      // Get current alert count
      const { count: beforeCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'Regulations.gov API');
      
      const initialCount = beforeCount || 0;
      
      // Test the Regulations.gov API
      const result = await triggerSpecificAgencyPipeline('GSA');
      
      // Get new alert count
      const { count: afterCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'Regulations.gov API');
      
      const newAlertsCount = (afterCount || 0) - initialCount;
      
      setTestResult(result);
      setAlertsCount(newAlertsCount);
      
      if (result?.success) {
        toast({
          title: "✅ Test Successful",
          description: `Regulations.gov API is working! Found ${newAlertsCount} new alerts.`,
        });
      } else {
        toast({
          title: "❌ Test Failed", 
          description: result?.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "❌ Test Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      setTestResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏛️ Test Regulations.gov API
        </CardTitle>
        <CardDescription>
          Test if the Regulations.gov API source is working properly with authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testRegulationsGovAPI} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing API...
            </>
          ) : (
            'Test Regulations.gov API'
          )}
        </Button>
        
        {testResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-semibold">
                {testResult.success ? 'Success!' : 'Failed'}
              </span>
              {testResult.success && (
                <Badge variant="secondary">
                  {alertsCount} new alerts
                </Badge>
              )}
            </div>
            
            {testResult.error && (
              <div className="text-red-600 text-sm mt-2">
                <strong>Error:</strong> {testResult.error}
              </div>
            )}
            
            {testResult.success && testResult.results && (
              <div className="text-sm text-gray-600 mt-2">
                <strong>Results:</strong> {JSON.stringify(testResult.results, null, 2)}
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-4">
          This test will call the enhanced regulatory data pipeline specifically for GSA (Regulations.gov) sources
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('https://supabase.com/dashboard/project/piyikxxgoekawboitrzz/functions/enhanced-regulatory-data-pipeline/logs', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View Logs
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('https://supabase.com/dashboard/project/piyikxxgoekawboitrzz/settings/functions', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Check Secrets
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
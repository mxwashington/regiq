import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, ExternalLink, Bug } from 'lucide-react';
import { triggerSpecificAgencyPipeline } from '@/lib/trigger-pipeline';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function TestRegulationsGov() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingDirect, setIsTestingDirect] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [directTestResult, setDirectTestResult] = useState<any>(null);
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
          title: "✅ Pipeline Test Complete",
          description: `Enhanced pipeline completed. Found ${newAlertsCount} new alerts.`,
        });
      } else {
        toast({
          title: "❌ Pipeline Test Failed", 
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

  const testDirectAPI = async () => {
    setIsTestingDirect(true);
    setDirectTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-regulations-gov');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setDirectTestResult(data);
      
      if (data?.success) {
        toast({
          title: "✅ Direct API Test Success",
          description: `Found ${data.totalDocuments} total documents, returned ${data.documentsReturned}`,
        });
      } else {
        toast({
          title: "❌ Direct API Test Failed",
          description: data?.error || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Direct test error:', error);
      setDirectTestResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      toast({
        title: "❌ Direct API Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsTestingDirect(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏛️ Test Regulations.gov API
        </CardTitle>
        <CardDescription>
          Debug and test the Regulations.gov API source with detailed diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={testDirectAPI} 
            disabled={isTestingDirect}
            variant="outline"
            className="w-full"
          >
            {isTestingDirect ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Direct API...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                Test Direct API
              </>
            )}
          </Button>

          <Button 
            onClick={testRegulationsGovAPI} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Pipeline...
              </>
            ) : (
              'Test Full Pipeline'
            )}
          </Button>
        </div>
        
        {/* Direct API Test Results */}
        {directTestResult && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              {directTestResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-semibold">
                Direct API Test: {directTestResult.success ? 'SUCCESS' : 'FAILED'}
              </span>
            </div>
            
            {directTestResult.success ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Documents Available:</span>
                  <Badge variant="secondary">{directTestResult.totalDocuments}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Documents Returned:</span>
                  <Badge variant="secondary">{directTestResult.documentsReturned}</Badge>
                </div>
                {directTestResult.sampleDocuments && (
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-1">Sample Documents:</div>
                    <div className="space-y-1">
                      {directTestResult.sampleDocuments.map((doc: any, i: number) => (
                        <div key={i} className="text-xs bg-background p-2 rounded border">
                          <div className="font-medium truncate">{doc.title}</div>
                          <div className="text-muted-foreground">
                            {doc.agency} • {doc.postedDate} • {doc.documentType}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600 text-sm mt-2">
                <strong>Error:</strong> {directTestResult.error}
                {directTestResult.details && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                    <pre>{JSON.stringify(directTestResult.debug, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pipeline Test Results */}
        {testResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-semibold">
                Pipeline Test: {testResult.success ? 'SUCCESS' : 'FAILED'}
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
          <div>• Direct API Test: Tests the Regulations.gov API directly with your key</div>
          <div>• Full Pipeline Test: Tests the complete enhanced regulatory data pipeline</div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('https://supabase.com/dashboard/project/piyikxxgoekawboitrzz/functions/enhanced-regulatory-data-pipeline/logs', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Pipeline Logs
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('https://supabase.com/dashboard/project/piyikxxgoekawboitrzz/functions/test-regulations-gov/logs', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Direct Test Logs
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
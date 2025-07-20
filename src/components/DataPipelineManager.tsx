import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlayCircle, StopCircle, RefreshCw, Database, Clock } from 'lucide-react';

interface PipelineStatus {
  isRunning: boolean;
  lastRun: string | null;
  totalAlertsProcessed: number;
  agencyResults: { [agency: string]: number };
  error?: string;
}

export function DataPipelineManager() {
  const [status, setStatus] = useState<PipelineStatus>({
    isRunning: false,
    lastRun: null,
    totalAlertsProcessed: 0,
    agencyResults: {}
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runPipeline = async () => {
    try {
      setLoading(true);
      setStatus(prev => ({ ...prev, isRunning: true, error: undefined }));

      toast({
        title: "Pipeline Started",
        description: "Data pipeline is now running. This may take a few minutes...",
      });

      const { data, error } = await supabase.functions.invoke('regulatory-data-pipeline', {
        body: {}
      });

      if (error) throw error;

      setStatus({
        isRunning: false,
        lastRun: new Date().toISOString(),
        totalAlertsProcessed: data.totalAlertsProcessed || 0,
        agencyResults: data.agencyResults || {}
      });

      toast({
        title: "Pipeline Completed",
        description: `Successfully processed ${data.totalAlertsProcessed || 0} new regulatory alerts.`,
      });

    } catch (error: any) {
      console.error('Pipeline error:', error);
      setStatus(prev => ({ 
        ...prev, 
        isRunning: false, 
        error: error.message || 'Pipeline failed'
      }));
      
      toast({
        title: "Pipeline Failed",
        description: error.message || "An error occurred while running the data pipeline.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getAgencyBadgeVariant = (count: number) => {
    if (count > 5) return 'default';
    if (count > 0) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Pipeline Control
          </CardTitle>
          <CardDescription>
            Manage the regulatory data pipeline that fetches updates from data.gov APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runPipeline} 
              disabled={loading || status.isRunning}
              className="flex items-center gap-2"
            >
              {loading || status.isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Run Pipeline
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last run: {formatDate(status.lastRun)}
            </div>
          </div>

          {status.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{status.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Results</CardTitle>
          <CardDescription>
            Results from the last pipeline execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{status.totalAlertsProcessed}</div>
              <div className="text-sm text-muted-foreground">Total Alerts Processed</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {Object.keys(status.agencyResults).length}
              </div>
              <div className="text-sm text-muted-foreground">Agencies Processed</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {status.isRunning ? 'Running' : 'Idle'}
              </div>
              <div className="text-sm text-muted-foreground">Pipeline Status</div>
            </div>
          </div>

          {Object.keys(status.agencyResults).length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Agency Results</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(status.agencyResults).map(([agency, count]) => (
                  <Badge 
                    key={agency} 
                    variant={getAgencyBadgeVariant(count)}
                    className="text-sm"
                  >
                    {agency}: {count} alerts
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agency Configuration</CardTitle>
          <CardDescription>
            Current agency polling intervals and priority settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: 'FDA', interval: '15 min', priority: 'High' },
                { name: 'USDA', interval: '15 min', priority: 'High' },
                { name: 'EPA', interval: '15 min', priority: 'High' },
                { name: 'CDC', interval: '60 min', priority: 'Medium' },
                { name: 'OSHA', interval: '60 min', priority: 'Medium' },
                { name: 'FTC', interval: '60 min', priority: 'Low' }
              ].map((agency) => (
                <div key={agency.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{agency.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Every {agency.interval}
                    </div>
                  </div>
                  <Badge 
                    variant={
                      agency.priority === 'High' ? 'default' :
                      agency.priority === 'Medium' ? 'secondary' : 'outline'
                    }
                  >
                    {agency.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DataFreshness {
  id: string;
  source_name: string;
  last_successful_fetch: string;
  last_attempt: string;
  fetch_status: string;
  error_message?: string;
  records_fetched: number;
}

export function DataFreshnessIndicator() {
  const [freshness, setFreshness] = useState<DataFreshness[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFreshness();
  }, []);

  const fetchFreshness = async () => {
    try {
      const { data, error } = await supabase
        .from('data_freshness')
        .select('*')
        .order('source_name');

      if (error) throw error;
      setFreshness(data || []);
    } catch (error) {
      console.error('Error fetching data freshness:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerDataCollection = async (source: string) => {
    setTriggering(source);
    try {
      const { error } = await supabase.functions.invoke('regulatory-data-pipeline', {
        body: { scheduled: false, force_source: source }
      });

      if (error) throw error;

      toast({
        title: 'Data collection triggered',
        description: `${source} data collection has been started.`
      });

      // Refresh freshness data after a short delay
      setTimeout(fetchFreshness, 2000);
    } catch (error) {
      console.error('Error triggering data collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to trigger data collection',
        variant: 'destructive'
      });
    } finally {
      setTriggering(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatLastFetch = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Freshness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Data Source Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {freshness.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(item.fetch_status)}
              <div>
                <div className="font-medium">{item.source_name}</div>
                <div className="text-sm text-muted-foreground">
                  Last fetch: {formatLastFetch(item.last_successful_fetch)} 
                  {item.records_fetched > 0 && ` • ${item.records_fetched} records`}
                </div>
                {item.error_message && (
                  <div className="text-xs text-red-600 mt-1 max-w-md truncate">
                    {item.error_message}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(item.fetch_status)}>
                {item.fetch_status}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={triggering === item.source_name}
                onClick={() => triggerDataCollection(item.source_name)}
              >
                {triggering === item.source_name ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
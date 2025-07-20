import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export function AlertsCleanStatus() {
  const [alertCount, setAlertCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAlertCount = async () => {
      try {
        const { count, error } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        setAlertCount(count || 0);
      } catch (error) {
        console.error('Error checking alert count:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAlertCount();
    
    // Check every 30 seconds for new data
    const interval = setInterval(checkAlertCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Checking database status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {alertCount === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-blue-500" />
              )}
              <span className="text-sm">
                {alertCount === 0 ? 'All dummy data removed' : 'Real alerts present'}
              </span>
            </div>
            <Badge variant={alertCount === 0 ? 'default' : 'secondary'}>
              {alertCount} alerts
            </Badge>
          </div>
          
          {alertCount === 0 && (
            <div className="text-xs text-muted-foreground">
              ✅ Database is clean - ready for real regulatory data
              <br />
              🚫 Automated data collection temporarily disabled
              <br />
              📡 Monitoring for new real alerts...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
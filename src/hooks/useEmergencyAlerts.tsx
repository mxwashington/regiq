import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmergencyAlert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  agency: string;
  source: string;
  published_date: string;
  external_url?: string;
  created_at: string;
  ai_summary?: string;
  urgency_score?: number;
  full_content?: string;
  dismissed_by?: string[];
}

interface UseEmergencyAlertsReturn {
  alerts: EmergencyAlert[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  retryCount: number;
  retryLoad: () => void;
  hasMore: boolean;
  loadMore: () => void;
}

const FALLBACK_ALERTS: EmergencyAlert[] = [
  {
    id: 'fallback-1',
    title: 'System in Emergency Mode',
    summary: 'RegIQ is currently operating in emergency mode. Authentication and database systems are being restored.',
    urgency: 'High',
    agency: 'System',
    source: 'Emergency Mode',
    published_date: new Date().toISOString(),
    external_url: undefined,
    created_at: new Date().toISOString(),
    ai_summary: undefined,
    urgency_score: 90,
    full_content: 'The RegIQ platform has detected system issues and is operating in emergency mode to maintain service availability.',
  },
  {
    id: 'fallback-2',
    title: 'Limited Functionality Available',
    summary: 'Core alert viewing is available. Full functionality will be restored once authentication systems are operational.',
    urgency: 'Medium',
    agency: 'System',
    source: 'Emergency Mode',
    published_date: new Date().toISOString(),
    external_url: undefined,
    created_at: new Date().toISOString(),
    ai_summary: undefined,
    urgency_score: 70,
    full_content: 'Basic alert functionality remains available during system recovery.',
  }
];

export const useEmergencyAlerts = (limit?: number): UseEmergencyAlertsReturn => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

  const loadAlertsWithRetry = async (maxRetries = 3) => {
    console.log('[useEmergencyAlerts] Starting emergency alerts load...');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[useEmergencyAlerts] Attempt ${attempt + 1}/${maxRetries + 1}`);
        setLoading(true);
        setError(null);

        // Try basic alerts table (emergency view doesn't exist)
        const { data: alertsData, error: alertsError } = await supabase
          .from('alerts')
          .select('*')
          .in('urgency', ['High', 'Critical'])
          .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('published_date', { ascending: false })
          .limit(limit || 20);

        if (alertsError) {
          console.warn('[useEmergencyAlerts] Emergency view failed:', alertsError.message);

          // Fallback to basic alerts table without RLS restrictions
          const { data: basicAlerts, error: basicError } = await supabase
            .from('alerts')
            .select(`
              id,
              title,
              summary,
              urgency,
              agency,
              source,
              published_date,
              external_url,
              created_at
            `)
            .gte('published_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('published_date', { ascending: false })
            .limit(limit || 20);

          if (basicError) {
            console.warn('[useEmergencyAlerts] Basic alerts also failed:', basicError.message);
            throw new Error(`Database access failed: ${basicError.message}`);
          }

          console.log('[useEmergencyAlerts] Using basic alerts fallback');
          setAlerts(basicAlerts || []);
          setTotalCount(basicAlerts?.length || 0);
        } else {
          console.log('[useEmergencyAlerts] Emergency view succeeded');
          setAlerts(alertsData || []);
          setTotalCount(alertsData?.length || 0);
        }

        // Count is already set from data length (RPC function doesn't exist)

        setHasMore(false); // Simplified for emergency mode
        setLoading(false);
        console.log(`[useEmergencyAlerts] Successfully loaded ${alerts.length} alerts`);
        return;

      } catch (error: any) {
        console.error(`[useEmergencyAlerts] Attempt ${attempt + 1} failed:`, error);
        setRetryCount(attempt + 1);

        if (attempt === maxRetries) {
          // Final fallback - use hardcoded alerts
          console.log('[useEmergencyAlerts] All database attempts failed - using fallback alerts');
          setAlerts(FALLBACK_ALERTS);
          setTotalCount(FALLBACK_ALERTS.length);
          setError('Database temporarily unavailable - showing system status');

          toast({
            title: "Emergency Mode Active",
            description: "Database connection issues detected. Showing system status information.",
            variant: "destructive"
          });
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    setLoading(false);
  };

  const retryLoad = () => {
    setRetryCount(0);
    loadAlertsWithRetry();
  };

  const loadMore = () => {
    console.log('[useEmergencyAlerts] Load more requested - not implemented in emergency mode');
  };

  useEffect(() => {
    loadAlertsWithRetry();
  }, [limit]);

  return {
    alerts,
    loading,
    error,
    totalCount,
    retryCount,
    retryLoad,
    hasMore,
    loadMore
  };
};
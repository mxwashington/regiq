import { supabase } from '@/integrations/supabase/client';

interface TriggerDataRefreshResponse {
  success: boolean;
  totalAlertsProcessed?: number;
  agencyResults?: Record<string, number>;
  message?: string;
  error?: string;
}

export async function triggerDataRefresh(): Promise<TriggerDataRefreshResponse> {
  try {
    console.log('Triggering regulatory data pipeline...');
    
    const { data, error } = await supabase.functions.invoke('regulatory-data-pipeline');
    
    if (error) {
      console.error('Data pipeline error:', error);
      throw new Error(error.message);
    }

    console.log('Data pipeline completed successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Error triggering data refresh:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Auto-trigger data refresh when this module loads to get fresh data
triggerDataRefresh().then(result => {
  if (result.success) {
    console.log(`✅ Data refresh completed: ${result.totalAlertsProcessed} new alerts processed`);
    console.log('Agency results:', result.agencyResults);
  } else {
    console.error('❌ Data refresh failed:', result.error);
  }
}).catch(error => {
  console.error('❌ Auto data refresh error:', error);
});
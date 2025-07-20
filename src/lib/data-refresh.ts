import { supabase } from '@/integrations/supabase/client';
import { triggerDataPipelineNow } from './trigger-pipeline';

interface TriggerDataRefreshResponse {
  success: boolean;
  totalAlertsProcessed?: number;
  agencyResults?: Record<string, number>;
  message?: string;
  error?: string;
}

export async function triggerDataRefresh(): Promise<TriggerDataRefreshResponse> {
  return await triggerDataPipelineNow();
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
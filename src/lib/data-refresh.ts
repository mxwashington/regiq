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

// Note: Auto-trigger removed to prevent conflicts. Use DataRefreshButton or cron job for refresh.
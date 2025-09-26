import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export async function triggerDataPipelineNow() {
  try {
    logger.info('🔄 Manually triggering data pipeline to fetch fresh data...');
    
    const { data, error } = await supabase.functions.invoke('regulatory-data-pipeline');
    
    if (error) {
      logger.error('❌ Data pipeline failed:', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Data pipeline completed successfully:', data);
    return data;
    
  } catch (error) {
    logger.error('❌ Error triggering data pipeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Note: Auto-trigger removed to prevent conflicts with centralized refresh system
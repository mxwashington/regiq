import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export async function triggerDataPipelineNow() {
  try {
    logger.info('🔄 Manually triggering enhanced data pipeline to test constraint fix...');
    
    const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-collection');
    
    if (error) {
      logger.error('❌ Enhanced data pipeline failed:', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Enhanced data pipeline completed successfully:', data);
    
    // Update data freshness after successful run
    if (data && data.success) {
      await supabase
        .from('data_freshness')
        .update({ 
          fetch_status: 'success', 
          last_successful_fetch: new Date().toISOString(),
          last_attempt: new Date().toISOString(),
          records_fetched: data.totalSaved || 0,
          error_message: null
        })
        .in('source_name', [
          'Enhanced EPA ECHO Enforcement',
          'Enhanced FSIS Meat & Poultry Recalls', 
          'Enhanced FDA Warning Letters',
          'Enhanced Federal Register Rules'
        ]);
    }
    
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
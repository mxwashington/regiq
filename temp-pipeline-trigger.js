// Temporary script to trigger enhanced regulatory data pipeline
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export const triggerPipeline = async () => {
  logger.info('🚀 Starting enhanced regulatory data pipeline...');
  
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-pipeline', {
      body: { 
        force_refresh: true,
        agency: 'FDA'  // Focus on FDA first to test new warning letters/483s
      }
    });
    
    if (error) {
      logger.error('❌ Pipeline error:', error);
      throw error;
    }
    
    logger.info('✅ Pipeline completed successfully:', data);
    return data;
  } catch (error) {
    logger.error('❌ Failed to run pipeline:', error);
    throw error;
  }
};

// Auto-execute when imported
triggerPipeline();
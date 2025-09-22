// Temporary script to trigger enhanced regulatory data pipeline
import { supabase } from '@/integrations/supabase/client';

export const triggerPipeline = async () => {
  console.log('🚀 Starting enhanced regulatory data pipeline...');
  
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-pipeline', {
      body: { 
        force_refresh: true,
        agency: 'FDA'  // Focus on FDA first to test new warning letters/483s
      }
    });
    
    if (error) {
      console.error('❌ Pipeline error:', error);
      throw error;
    }
    
    console.log('✅ Pipeline completed successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to run pipeline:', error);
    throw error;
  }
};

// Auto-execute when imported
triggerPipeline();
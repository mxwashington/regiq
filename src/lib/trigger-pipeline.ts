import { supabase } from '@/integrations/supabase/client';

export async function triggerDataPipelineNow() {
  try {
    console.log('🔄 Manually triggering data pipeline to fetch fresh data...');
    
    const { data, error } = await supabase.functions.invoke('regulatory-data-pipeline');
    
    if (error) {
      console.error('❌ Data pipeline failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Data pipeline completed successfully:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error triggering data pipeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Note: Auto-trigger removed to prevent conflicts with centralized refresh system
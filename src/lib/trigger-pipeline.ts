import { supabase } from '@/integrations/supabase/client';

export async function triggerDataPipelineNow() {
  try {
    console.log('🔄 Manually triggering enhanced data pipeline to fetch fresh data...');
    
    const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-pipeline', {
      body: { force_refresh: true }
    });
    
    if (error) {
      console.error('❌ Enhanced data pipeline failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Enhanced data pipeline completed successfully:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error triggering enhanced data pipeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function triggerSpecificAgencyPipeline(agency: string) {
  try {
    console.log(`🔄 Testing ${agency} data source...`);
    
    const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-pipeline', {
      body: { 
        agency: agency,
        force_refresh: true 
      }
    });
    
    if (error) {
      console.error(`❌ ${agency} pipeline failed:`, error);
      return { success: false, error: error.message };
    }

    console.log(`✅ ${agency} pipeline completed successfully:`, data);
    return data;
    
  } catch (error) {
    console.error(`❌ Error testing ${agency} pipeline:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Note: Auto-trigger removed to prevent conflicts with centralized refresh system
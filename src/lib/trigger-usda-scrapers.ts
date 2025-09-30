import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export async function triggerUSDAScrapers() {
  try {
    logger.info('🌾 Triggering USDA scrapers...');
    
    // Trigger ARMS scraper
    const { data: armsData, error: armsError } = await supabase.functions.invoke('usda-arms-scraper');
    
    if (armsError) {
      logger.error('❌ USDA ARMS scraper failed:', armsError);
    } else {
      logger.info('✅ USDA ARMS scraper completed:', armsData);
    }
    
    // Trigger FoodData scraper
    const { data: foodData, error: foodError } = await supabase.functions.invoke('usda-fooddata-scraper');
    
    if (foodError) {
      logger.error('❌ USDA FoodData scraper failed:', foodError);
    } else {
      logger.info('✅ USDA FoodData scraper completed:', foodData);
    }
    
    return {
      success: !armsError && !foodError,
      arms: armsData,
      foodData: foodData
    };
    
  } catch (error) {
    logger.error('❌ Error triggering USDA scrapers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Auto-trigger on import
triggerUSDAScrapers();

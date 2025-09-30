import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const trackConversionEvent = async (
  eventName: string,
  metadata: Record<string, any>
) => {
  try {
    await supabase.from('alert_interactions').insert({
      user_id: metadata.user_id,
      interaction_type: eventName,
      interaction_data: metadata
    });
    logger.info(`Conversion event tracked: ${eventName}`, metadata);
  } catch (error) {
    logger.error('Analytics tracking failed:', error);
  }
};

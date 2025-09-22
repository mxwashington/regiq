import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchFoodSafetyDocuments } from '@/services/regulatoryService';

export const useRegulatoryMonitoring = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const updates = await fetchFoodSafetyDocuments();
        
        // Store updates in Supabase regulatory_updates table
        if (updates.length > 0) {
          const { error } = await supabase
            .from('regulatory_updates')
            .upsert(
              updates.map(update => ({
                document_id: update.id,
                title: update.title,
                agency: update.agency,
                posted_date: update.postedDate ? new Date(update.postedDate).toISOString().split('T')[0] : null,
                summary: update.summary,
                consumer_impact: update.consumerImpact,
                family_action: update.familyAction,
                document_type: update.documentType,
                is_featured: false
              })),
              { 
                onConflict: 'document_id',
                ignoreDuplicates: true
              }
            );
            
          if (error) {
            console.error('Error storing regulatory updates:', error);
          } else {
            console.log(`Stored ${updates.length} regulatory updates`);
          }
        }
      } catch (error) {
        console.error('Regulatory monitoring error:', error);
      }
    };

    // Check for updates immediately
    checkForUpdates();

    // Check every 4 hours (within rate limits)
    const interval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
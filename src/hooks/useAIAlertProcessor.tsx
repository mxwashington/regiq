import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIProcessingResult {
  success: boolean;
  alertId?: string;
  summary?: string;
  urgencyScore?: number;
  processed?: number;
  errors?: number;
  total?: number;
}

export const useAIAlertProcessor = () => {
  const [processing, setProcessing] = useState(false);

  const processAlert = async (alertId: string): Promise<AIProcessingResult> => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-alert-processor', {
        body: { alertId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Alert processed with AI summary');
      }

      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to process alert';
      toast.error(errorMessage);
      return { success: false };
    } finally {
      setProcessing(false);
    }
  };

  const processBatch = async (): Promise<AIProcessingResult> => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-alert-processor', {
        body: { batchProcess: true }
      });

      if (error) throw error;

      toast.success(`Batch processed: ${data.processed} alerts, ${data.errors} errors`);
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to process batch';
      toast.error(errorMessage);
      return { success: false };
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    processAlert,
    processBatch
  };
};
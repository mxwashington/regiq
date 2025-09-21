import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ComplianceResponse {
  answer: string;
  facilityContext: {
    facilityType: string | null;
    products: string | null;
    currentCertifications: string | null;
  };
  contextAlertsCount: number;
  queriesUsedToday: number;
  dailyLimit: number;
}

interface ComplianceQuery {
  question: string;
  facilityType?: string;
  products?: string;
  currentCertifications?: string;
}

export const useAIComplianceAssistant = () => {
  const [loading, setLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);

  const askQuestion = async (query: ComplianceQuery): Promise<ComplianceResponse | null> => {
    if (!query.question?.trim()) {
      toast.error('Please enter a question');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-compliance-assistant', {
        body: query
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setQueryCount(data.queriesUsedToday || 0);
      
      // Show usage warning if approaching limit
      if (data.queriesUsedToday >= 45) {
        toast.warning(`You've used ${data.queriesUsedToday}/${data.dailyLimit} daily queries`);
      }

      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get AI response';
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    queryCount,
    askQuestion
  };
};
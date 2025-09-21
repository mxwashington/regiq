import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpgradeOptions {
  targetPlan: string;
  annual?: boolean;
}

interface UseSubscriptionUpgradeReturn {
  upgradeToStarter: () => Promise<void>;
  upgradeToCustomPlan: (options: UpgradeOptions) => Promise<void>;
  loading: boolean;
}

export const useSubscriptionUpgrade = (): UseSubscriptionUpgradeReturn => {
  const [loading, setLoading] = useState(false);

  const upgradeToCustomPlan = async ({ targetPlan, annual = false }: UpgradeOptions) => {
    try {
      setLoading(true);
      
      // Map new plan names to backend-compatible formats
      const planMapping = {
        starter: 'starter',
        growth: 'growth', 
        professional: 'professional'
      };
      
      const mappedPlan = planMapping[targetPlan as keyof typeof planMapping] || targetPlan;
      
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { targetPlan: mappedPlan, annual }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open checkout in new tab
        window.open(data.url, '_blank');
        toast.success('Redirecting to secure checkout...');
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade process');
    } finally {
      setLoading(false);
    }
  };

  const upgradeToStarter = async () => {
    await upgradeToCustomPlan({ targetPlan: 'starter' });
  };

  return {
    upgradeToStarter,
    upgradeToCustomPlan,
    loading
  };
};
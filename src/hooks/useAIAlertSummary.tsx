import { useState } from 'react';
import { useUsageLimits } from './useUsageLimits';
import { useUserProfile } from './useUserProfile';
import { useAIAlertProcessor } from './useAIAlertProcessor';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { trackConversionEvent } from '@/lib/telemetry/conversion-events';

interface UseAIAlertSummaryReturn {
  showLimitModal: boolean;
  currentAlert: { id: string; title: string } | null;
  canProcessSummary: (alertId: string, alertTitle: string) => Promise<boolean>;
  handleUpgradeModal: (show: boolean) => void;
  handleReadManually: () => void;
  processSummary: (alertId: string) => Promise<void>;
}

/**
 * Hook to manage AI alert summary generation with usage limits
 * Shows upgrade modal when Starter users hit their 5 summary/month limit
 */
export const useAIAlertSummary = (): UseAIAlertSummaryReturn => {
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<{ id: string; title: string } | null>(null);
  
  const { user } = useAuth();
  const { checkAndLogUsage } = useUsageLimits();
  const { subscriptionTier } = useUserProfile();
  const { processAlert } = useAIAlertProcessor();

  /**
   * Check if user can process an AI summary
   * Shows upgrade modal if limit is reached
   */
  const canProcessSummary = async (alertId: string, alertTitle: string): Promise<boolean> => {
    const tier = subscriptionTier || 'starter';
    const result = await checkAndLogUsage('ai_summary', tier as any);

    if (!result.allowed) {
      // Track conversion event when user hits limit
      if (user) {
        await trackConversionEvent('ai_summary_limit_reached', {
          user_id: user.id,
          tier: tier,
          alert_id: alertId
        });
      }

      // Show upgrade modal for Starter users who hit limit
      setCurrentAlert({ id: alertId, title: alertTitle });
      setShowLimitModal(true);
      return false;
    }

    return true;
  };

  /**
   * Process AI summary after checking limits
   */
  const processSummary = async (alertId: string) => {
    await processAlert(alertId);
  };

  /**
   * Handle upgrade modal visibility
   */
  const handleUpgradeModal = async (show: boolean) => {
    setShowLimitModal(show);
    
    if (!show && user) {
      // Track modal dismissed event
      await trackConversionEvent('upgrade_modal_dismissed', {
        user_id: user.id,
        tier: subscriptionTier || 'starter',
        context: 'ai_summary_limit'
      });
      setCurrentAlert(null);
    }
  };

  /**
   * Handle "Read Manually" button click
   * Closes modal and allows user to view full alert
   */
  const handleReadManually = () => {
    setShowLimitModal(false);
    setCurrentAlert(null);
    toast.info('Showing full alert without AI summary');
  };

  return {
    showLimitModal,
    currentAlert,
    canProcessSummary,
    handleUpgradeModal,
    handleReadManually,
    processSummary
  };
};

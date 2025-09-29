import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap } from 'lucide-react';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';

interface AISummaryLimitModalProps {
  open: boolean;
  onClose: () => void;
  onReadManually: () => void;
  alertTitle: string;
}

export const AISummaryLimitModal: React.FC<AISummaryLimitModalProps> = ({
  open,
  onClose,
  onReadManually,
  alertTitle
}) => {
  const { upgradeToCustomPlan, loading } = useSubscriptionUpgrade();

  const handleUpgrade = async () => {
    await upgradeToCustomPlan({ targetPlan: 'growth' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            You've used all 5 AI summaries this month
          </DialogTitle>
          <DialogDescription className="text-left space-y-4 pt-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="font-medium text-foreground mb-1">Your next alert:</p>
              <p className="text-sm">{alertTitle}</p>
            </div>

            <p className="text-muted-foreground">
              Reading this manually will take 10-15 minutes. Want an AI summary instead?
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="font-semibold mb-3">Upgrade to Growth ($29/month):</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  100 AI summaries per month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  20 AI-powered searches per month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  Unlimited saved alerts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  Export to PDF/CSV
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleUpgrade} 
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading ? 'Processing...' : 'Upgrade to Growth - $29/month'}
              </Button>
              <Button 
                onClick={onReadManually} 
                variant="outline"
                size="lg"
                className="w-full"
              >
                Read Alert Manually
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime.
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

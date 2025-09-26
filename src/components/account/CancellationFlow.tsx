import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export const CancellationFlow: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Log cancellation survey response
      if (reason.trim()) {
        const { error: logError } = await supabase
          .from('usage_logs')
          .insert({
            user_id: user.id,
            feature_name: 'cancellation_survey',
            amount: 1,
            metadata: {
              reason: reason.trim(),
              timestamp: new Date().toISOString()
            }
          });

        if (logError) {
          logger.error('Error logging cancellation reason:', logError);
        }
      }

      // Open customer portal
      logger.info('Opening customer portal for cancellation');
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: {
          user_id: user.id,
          action: 'cancellation'
        }
      });

      if (error) {
        logger.error('Customer portal error:', error);
        toast.error(`Could not open billing portal: ${error.message}`);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Opening cancellation portal...');
        setOpen(false);
        setReason('');
      } else {
        toast.error('No billing portal URL received');
      }
    } catch (error) {
      logger.error('Cancellation flow error:', error);
      toast.error('An error occurred during cancellation');
    } finally {
      setLoading(false);
    }
  };

  // Don't show cancellation for admin users
  if (isAdmin) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Cancel Subscription</CardTitle>
        <CardDescription>We’re sorry to see you go. Help us improve.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end">
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          disabled={loading}
        >
          Start Cancellation
        </Button>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you cancel...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Help us improve (optional)
              </label>
              <textarea
                className="w-full h-28 border rounded p-3 bg-background resize-none"
                placeholder="What could we do better? Your feedback helps us serve you better."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                disabled={loading}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {reason.length}/500 characters
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submit}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Continue to Portal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CancellationFlow;

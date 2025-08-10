import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const CancellationFlow: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const submit = async () => {
    if (user) {
      await (supabase as any).from('usage_logs').insert({ user_id: user.id, feature_name: 'cancellation_survey', amount: 1, metadata: { reason } });
    }
    const { data } = await (supabase as any).functions.invoke('customer-portal');
    if (data?.url) window.open(data.url, '_blank');
    setOpen(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Cancel Subscription</CardTitle>
        <CardDescription>We’re sorry to see you go. Help us improve.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end">
        <Button variant="destructive" onClick={()=>setOpen(true)}>Start Cancellation</Button>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you cancel...</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea className="w-full h-28 border rounded p-2 bg-background" placeholder="What could we do better?" value={reason} onChange={(e)=>setReason(e.target.value)} />
            <div className="text-right">
              <Button variant="outline" className="mr-2" onClick={()=>setOpen(false)}>Back</Button>
              <Button variant="destructive" onClick={submit}>Continue to Portal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CancellationFlow;

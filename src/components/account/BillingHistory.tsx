import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const BillingHistory: React.FC = () => {
  const { user } = useAuth();
  const openPortal = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).functions.invoke('customer-portal');
    if (!error && data?.url) window.open(data.url, '_blank');
  };
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>View invoices and payment methods in the Stripe portal.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end">
        <Button onClick={openPortal}>Open Billing Portal</Button>
      </CardContent>
    </Card>
  );
};

export default BillingHistory;

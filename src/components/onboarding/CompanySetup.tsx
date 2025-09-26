import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { logger } from '@/lib/logger';
export const CompanySetup: React.FC<{ onNext: () => void }>=({ onNext })=>{
  const { user } = useAuth();
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!user) return onNext();
    setLoading(true);
    try {
      // Start trial period for new users
      const trialStartsAt = new Date();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialStartsAt.getDate() + 7); // 7-day trial

      await supabase.from('profiles').upsert({ 
        user_id: user.id, 
        email: user.email as string, 
        company,
        trial_starts_at: trialStartsAt.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_status: 'trial'
      });
      toast.success('Company saved - Your 7-day trial has started!');
      onNext();
    } catch (e) {
      logger.error(e);
      toast.error('Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Setup</CardTitle>
        <CardDescription>Your company name appears on invoices and dashboards.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="company">Company Name</Label>
          <Input id="company" value={company} onChange={(e)=>setCompany(e.target.value)} placeholder="Acme Foods, Inc." />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Continue'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanySetup;

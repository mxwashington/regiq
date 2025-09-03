import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { UsageDashboard } from '@/components/UsageDashboard';
import UsageStats from '@/components/account/UsageStats';
import BillingHistory from '@/components/account/BillingHistory';
import TeamManagement from '@/components/account/TeamManagement';
import CancellationFlow from '@/components/account/CancellationFlow';


const Account: React.FC = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [urgency, setUrgency] = useState<'Low'|'Medium'|'High'>('Low');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('company')
        .eq('user_id', user.id)
        .maybeSingle();
      setCompany(profile?.company ?? '');

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('email_notifications, urgency_threshold')
        .eq('user_id', user.id)
        .maybeSingle();
      setEmailNotifications(prefs?.email_notifications ?? true);
      setUrgency((prefs?.urgency_threshold as any) ?? 'Low');
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from('profiles').upsert({ user_id: user.id, email: user.email as string, company });
      await supabase.from('user_preferences').upsert({ user_id: user.id, email_notifications: emailNotifications, urgency_threshold: urgency });
      toast.success('Settings saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async () => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke('create-checkout');
    if (error) return toast.error('Could not start trial');
    if (data?.url) window.open(data.url, '_blank');
  };

  const manageBilling = async () => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) return toast.error('Could not open billing portal');
    if (data?.url) window.open(data.url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Account Settings - RegIQ</title>
        <meta name="description" content="Manage your RegIQ account, company profile, and email preferences." />
      </Helmet>

      <section className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
            <CardDescription>Used for billing and personalization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="company">Company Name</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Foods, Inc." />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Email Preferences</CardTitle>
            <CardDescription>Configure daily digest notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input id="email_notifications" type="checkbox" checked={emailNotifications} onChange={(e)=>setEmailNotifications(e.target.checked)} />
              <Label htmlFor="email_notifications">Receive daily digest email</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="urgency">Minimum urgency</Label>
              <select id="urgency" className="border rounded px-3 py-2 bg-background" value={urgency} onChange={(e)=>setUrgency(e.target.value as any)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
              <Button variant="outline" onClick={startTrial}>Start Free Trial</Button>
              <Button variant="outline" onClick={manageBilling}>Manage Billing</Button>
            </div>
          </CardContent>
        </Card>

        <UsageDashboard />
        
        <UsageStats />
        <BillingHistory />
        <TeamManagement />
        <CancellationFlow />
      </section>
      
    </div>
  );
};

export default Account;

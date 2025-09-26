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
import { useSecureProfileUpdate } from '@/hooks/useSecureProfileUpdate';

import { logger } from '@/lib/logger';
const Account: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { updateProfile } = useSecureProfileUpdate();
  const [company, setCompany] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [urgency, setUrgency] = useState<'Low'|'Medium'|'High'>('Low');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      try {
        // Use the secure profiles view
        const { data: profile } = await supabase
          .from('profiles_secure')
          .select('company_name, full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        setCompany(profile?.company_name ?? '');
        setFullName(profile?.full_name ?? '');

        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('email_notifications, urgency_threshold')
          .eq('user_id', user.id)
          .maybeSingle();

        setEmailNotifications(prefs?.email_notifications ?? true);
        setUrgency((prefs?.urgency_threshold as any) ?? 'Low');
      } catch (error) {
        logger.error('Error loading account data:', error);
        toast.error('Failed to load account information');
      }
    };
    load();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Update profile using secure function
      const profileSuccess = await updateProfile({
        full_name: fullName,
        company: company
      });

      if (!profileSuccess) {
        setLoading(false);
        return;
      }

      // Update preferences
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          email_notifications: emailNotifications,
          urgency_threshold: urgency
        });

      if (prefsError) {
        throw prefsError;
      }

      toast.success('Settings saved successfully');
    } catch (e) {
      logger.error('Account save error:', e);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async () => {
    if (!user) return;

    setTrialLoading(true);
    try {
      logger.info('Starting trial for user:', user.id);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { user_id: user.id }
      });

      if (error) {
        logger.error('Trial creation error:', error);
        toast.error(`Could not start trial: ${error.message}`);
        return;
      }

      if (data?.url) {
        logger.info('Opening checkout URL:', data.url);
        window.open(data.url, '_blank');
        toast.success('Opening checkout...');
      } else {
        toast.error('No checkout URL received');
      }
    } catch (e) {
      logger.error('Trial error:', e);
      toast.error('An error occurred while starting trial');
    } finally {
      setTrialLoading(false);
    }
  };

  const manageBilling = async () => {
    if (!user) return;

    setBillingLoading(true);
    try {
      logger.info('Opening billing portal for user:', user.id);
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { user_id: user.id }
      });

      if (error) {
        logger.error('Billing portal error:', error);
        toast.error(`Could not open billing portal: ${error.message}`);
        return;
      }

      if (data?.url) {
        logger.info('Opening billing portal URL:', data.url);
        window.open(data.url, '_blank');
        toast.success('Opening billing portal...');
      } else {
        toast.error('No billing portal URL received');
      }
    } catch (e) {
      logger.error('Billing portal error:', e);
      toast.error('An error occurred while opening billing portal');
    } finally {
      setBillingLoading(false);
    }
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
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Foods, Inc."
                maxLength={200}
              />
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
            <div className="flex gap-3 flex-wrap">
              <Button onClick={save} disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
              {!isAdmin && (
                <Button
                  variant="outline"
                  onClick={startTrial}
                  disabled={trialLoading}
                >
                  {trialLoading ? 'Loading...' : 'Start Free Trial'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={manageBilling}
                disabled={billingLoading}
              >
                {billingLoading ? 'Loading...' : 'Open Billing Portal'}
              </Button>
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

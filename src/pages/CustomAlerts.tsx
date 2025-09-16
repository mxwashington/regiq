import React from 'react';
import { Helmet } from 'react-helmet-async';
import { CustomAlertRules } from '@/components/CustomAlertRules';
import { BackButton } from '@/components/BackButton';
import { Mail, Bell } from 'lucide-react';

const CustomAlerts: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Custom Alert Rules | RegIQ</title>
        <meta name="description" content="Create custom email alerts for specific terms and get notified when new regulatory alerts match your interests." />
        <link rel="canonical" href="https://regiq.com/custom-alerts" />
      </Helmet>
      
      <main className="container mx-auto p-4">
        <div className="mb-4">
          <BackButton fallback="/dashboard" />
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Custom Alert Rules</h1>
          </div>
          <p className="text-muted-foreground">
            Set up personalized email alerts for specific terms, product names, or companies.
          </p>
        </div>

        <CustomAlertRules />
      </main>
    </>
  );
};

export default CustomAlerts;
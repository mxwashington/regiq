import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

import { logger } from '@/lib/logger';
const PaymentSuccess: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Verify subscription status after successful payment
    const checkSubscription = async () => {
      if (!user) return;
      
      try {
        await supabase.functions.invoke('check-subscription');
        toast.success('Subscription activated successfully!');
      } catch (error) {
        logger.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-accent/5">
      <Helmet>
        <title>Payment Successful | RegIQ</title>
        <meta name="description" content="Your subscription is active. Welcome to RegIQ Premium." />
        <link rel="canonical" href="https://regiq.com/payment-success" />
      </Helmet>
      
      <div className="text-center max-w-md">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground mb-6">
            Your subscription is now active. Let's get you set up with personalized alerts.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button size="lg" asChild>
            <Link to="/onboarding">Complete Setup</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Your 7-day free trial has started. No charges until trial ends.
        </p>
      </div>
    </div>
  )
};

export default PaymentSuccess;

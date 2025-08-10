import React from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PaymentSuccess: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <Helmet>
      <title>Payment Successful | RegIQ</title>
      <meta name="description" content="Your subscription is active. Welcome to RegIQ Premium." />
      <link rel="canonical" href="https://regiq.com/success" />
    </Helmet>
    <div className="text-center max-w-md">
      <h1 className="text-3xl font-bold mb-2">You're all set!</h1>
      <p className="text-muted-foreground mb-6">Your payment was successful and your subscription is active.</p>
      <div className="flex gap-3 justify-center">
        <Button asChild><Link to="/onboarding">Start Onboarding</Link></Button>
        <Button variant="outline" asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
      </div>
    </div>
  </div>
);

export default PaymentSuccess;

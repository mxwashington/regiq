import React from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PaymentCanceled: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <Helmet>
      <title>Payment Canceled | RegIQ</title>
      <meta name="description" content="Your payment was canceled. You can try again anytime." />
      <link rel="canonical" href="https://regiq.com/cancel" />
    </Helmet>
    <div className="text-center max-w-md">
      <h1 className="text-3xl font-bold mb-2">Payment Canceled</h1>
      <p className="text-muted-foreground mb-6">No worries—your account hasn’t been charged.</p>
      <div className="flex gap-3 justify-center">
        <Button asChild><Link to="/pricing">Back to Pricing</Link></Button>
        <Button variant="outline" asChild><Link to="/">Return Home</Link></Button>
      </div>
    </div>
  </div>
);

export default PaymentCanceled;

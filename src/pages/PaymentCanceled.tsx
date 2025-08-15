import React from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

const PaymentCanceled: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-muted/20 to-background">
    <Helmet>
      <title>Payment Canceled | RegIQ</title>
      <meta name="description" content="Your payment was canceled. You can try again anytime." />
      <link rel="canonical" href="https://regiq.com/payment-canceled" />
    </Helmet>
    
    <div className="text-center max-w-md">
      <div className="mb-6">
        <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Payment Canceled</h1>
        <p className="text-muted-foreground mb-6">
          No worries—your account hasn't been charged. You can try again anytime.
        </p>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button size="lg" asChild>
          <Link to="/pricing">Back to Pricing</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Need help? Contact our support team.
      </p>
    </div>
  </div>
);

export default PaymentCanceled;
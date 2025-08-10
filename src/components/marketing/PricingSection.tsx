import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const PricingSection: React.FC = () => {
  return (
    <section className="py-8 md:py-12 px-4 bg-muted/20">
      <div className="container mx-auto max-w-4xl">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Premium</CardTitle>
            <CardDescription>All-in-one regulatory monitoring for food & life sciences</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-end justify-center gap-2">
              <span className="text-5xl font-bold">$799</span>
              <span className="text-muted-foreground mb-2">/month</span>
            </div>
            <ul className="text-sm text-muted-foreground grid gap-2 max-w-md mx-auto">
              <li>• Real-time FDA/USDA/EPA alerts</li>
              <li>• AI summaries, urgency scoring, and source citations</li>
              <li>• Supplier watch and daily email digests</li>
              <li>• Exports and mobile-optimized dashboard</li>
            </ul>
            <Button size="lg" asChild>
              <Link to="/pricing">Start 14-Day Free Trial</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PricingSection;

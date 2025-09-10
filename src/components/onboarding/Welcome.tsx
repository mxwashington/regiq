import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Welcome: React.FC<{ onNext: () => void }>=({ onNext })=>{
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to RegIQ Premium!</CardTitle>
        <CardDescription>
          Let's personalize your alerts. This takes under 2 minutes.
          <br />
          <strong className="text-primary">Your 7-day free trial starts now!</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold text-primary mb-2">✨ What's included in your trial:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Unlimited regulatory alerts from FDA, USDA, EPA</li>
            <li>• Advanced search and filtering</li>
            <li>• Supplier risk monitoring</li>
            <li>• AI-powered compliance assistant</li>
            <li>• Export and sharing features</li>
          </ul>
        </div>
        <div className="flex justify-end">
          <Button onClick={onNext}>Get Started</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Welcome;
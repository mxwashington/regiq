import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Welcome: React.FC<{ onNext: () => void }>=({ onNext })=>{
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to RegIQ Premium!</CardTitle>
        <CardDescription>Let’s personalize your alerts. This takes under 2 minutes.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end">
        <Button onClick={onNext}>Get Started</Button>
      </CardContent>
    </Card>
  );
};

export default Welcome;

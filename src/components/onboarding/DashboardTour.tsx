import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const DashboardTour: React.FC<{ onBack: () => void }>=({ onBack })=>{
  return (
    <Card>
      <CardHeader>
        <CardTitle>You're all set!</CardTitle>
        <CardDescription>Alerts are configured. You can adjust settings anytime.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default DashboardTour;

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Minus } from "lucide-react";

const Row = ({ feature, free, premium }: { feature: string; free: boolean | string; premium: boolean | string }) => (
  <TableRow>
    <TableCell className="font-medium">{feature}</TableCell>
    <TableCell>{typeof free === 'string' ? free : free ? <Check className="h-4 w-4 text-primary" /> : <Minus className="h-4 w-4 text-muted-foreground" />}</TableCell>
    <TableCell>{typeof premium === 'string' ? premium : premium ? <Check className="h-4 w-4 text-primary" /> : <Minus className="h-4 w-4 text-muted-foreground" />}</TableCell>
  </TableRow>
);

export const FeatureComparison: React.FC = () => {
  return (
    <section id="feature-comparison" className="py-8 md:py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl md:text-3xl">Free vs Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Free</TableHead>
                  <TableHead>Premium ($799/mo)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Row feature="FDA/USDA/EPA alerts" free={true} premium={true} />
                <Row feature="AI summaries + urgency" free={false} premium={true} />
                <Row feature="Supplier watch (25)" free={false} premium={true} />
                <Row feature="Daily email digest" free={false} premium={true} />
                <Row feature="Mobile dashboard" free={true} premium={true} />
                <Row feature="CSV/PDF export" free={false} premium={true} />
                <Row feature="Team controls" free={false} premium={"Coming soon"} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FeatureComparison;

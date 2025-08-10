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
            {/* Mobile: compact table that fits on one screen */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 text-[11px] font-medium text-muted-foreground px-2 pb-2">
                <div>Feature</div>
                <div className="text-center">Free</div>
                <div className="text-center">Premium ($799/mo)</div>
              </div>
              <div className="rounded-md border">
                {[
                  { feature: "FDA/USDA/EPA alerts", free: true, premium: true },
                  { feature: "AI summaries + urgency scoring", free: false, premium: true },
                  { feature: "Supplier watch (25 suppliers)", free: false, premium: true },
                  { feature: "Daily email digest", free: false, premium: true },
                  { feature: "Mobile dashboard", free: true, premium: true },
                  { feature: "CSV/PDF export", free: false, premium: true },
                  { feature: "Team controls (Coming soon)", free: false, premium: "Coming soon" },
                ].map((row, i, arr) => (
                  <div key={row.feature} className={`grid grid-cols-3 items-center px-2 py-2 ${i !== arr.length - 1 ? 'border-b' : ''}`}>
                    <div className="text-xs leading-snug pr-2">{row.feature}</div>
                    <div className="text-center">
                      {typeof row.free === 'string' ? (<span className="text-[11px] text-muted-foreground">{row.free}</span>) : row.free ? (<Check className="h-4 w-4 text-primary inline" />) : (<Minus className="h-4 w-4 text-muted-foreground inline" />)}
                    </div>
                    <div className="text-center">
                      {typeof row.premium === 'string' ? (<span className="text-[11px] text-muted-foreground">{row.premium}</span>) : row.premium ? (<Check className="h-4 w-4 text-primary inline" />) : (<Minus className="h-4 w-4 text-muted-foreground inline" />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop/tablet */}
            <div className="hidden md:block">
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
                  <Row feature="AI summaries + urgency scoring" free={false} premium={true} />
                  <Row feature="Supplier watch (25 suppliers)" free={false} premium={true} />
                  <Row feature="Daily email digest" free={false} premium={true} />
                  <Row feature="Mobile dashboard" free={true} premium={true} />
                  <Row feature="CSV/PDF export" free={false} premium={true} />
                  <Row feature="Team controls (Coming soon)" free={false} premium={"Coming soon"} />
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FeatureComparison;

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Minus } from "lucide-react";

const Row = ({ feature, free, paid }: { feature: string; free: boolean | string; paid: boolean | string }) => (
  <TableRow>
    <TableCell className="font-medium">{feature}</TableCell>
    <TableCell>{typeof free === 'string' ? free : free ? <Check className="h-4 w-4 text-primary" /> : <Minus className="h-4 w-4 text-muted-foreground" />}</TableCell>
    <TableCell>{typeof paid === 'string' ? paid : paid ? <Check className="h-4 w-4 text-primary" /> : <Minus className="h-4 w-4 text-muted-foreground" />}</TableCell>
  </TableRow>
);

export const FeatureComparison: React.FC = () => {
  return (
    <section id="feature-comparison" className="py-8 md:py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl md:text-3xl">Free vs Paid Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: compact table that fits on one screen */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 text-[11px] font-medium text-muted-foreground px-2 pb-2">
                <div>Feature</div>
                <div className="text-center">Starter (Free)</div>
                <div className="text-center">Growth ($29/mo)</div>
              </div>
              <div className="rounded-md border">
                {[
                  { feature: "FDA/USDA/EPA/CDC alerts", free: true, paid: true },
                  { feature: "AI summaries", free: "5/month", paid: "100/month" },
                  { feature: "AI-powered searches", free: false, paid: "20/month" },
                  { feature: "Conversational AI chatbot", free: false, paid: true },
                  { feature: "Save alerts", free: "Up to 10", paid: "Unlimited" },
                  { feature: "PDF/CSV export", free: false, paid: "50/month" },
                  { feature: "Email support", free: "Community", paid: "48hr response" },
                ].map((row, i, arr) => (
                  <div key={row.feature} className={`grid grid-cols-3 items-center px-2 py-2 ${i !== arr.length - 1 ? 'border-b' : ''}`}>
                    <div className="text-xs leading-snug pr-2">{row.feature}</div>
                    <div className="text-center">
                      {typeof row.free === 'string' ? (<span className="text-[11px] text-muted-foreground">{row.free}</span>) : row.free ? (<Check className="h-4 w-4 text-primary inline" />) : (<Minus className="h-4 w-4 text-muted-foreground inline" />)}
                    </div>
                    <div className="text-center">
                      {typeof row.paid === 'string' ? (<span className="text-[11px] text-muted-foreground">{row.paid}</span>) : row.paid ? (<Check className="h-4 w-4 text-primary inline" />) : (<Minus className="h-4 w-4 text-muted-foreground inline" />)}
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
                    <TableHead>Starter (Free)</TableHead>
                    <TableHead>Growth ($29/mo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <Row feature="FDA/USDA/EPA/CDC alerts" free={true} paid={true} />
                  <Row feature="AI summaries" free="5/month" paid="100/month" />
                  <Row feature="AI-powered searches" free={false} paid="20/month" />
                  <Row feature="Conversational AI chatbot" free={false} paid={true} />
                  <Row feature="Save alerts" free="Up to 10" paid="Unlimited" />
                  <Row feature="PDF/CSV export" free={false} paid="50/month" />
                  <Row feature="Email support" free="Community" paid="48hr response" />
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

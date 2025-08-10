import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export const ROICalculator: React.FC = () => {
  const [teamSize, setTeamSize] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(60);
  const [hoursSaved, setHoursSaved] = useState(10);

  const monthlySavings = useMemo(() => teamSize * hourlyRate * hoursSaved, [teamSize, hourlyRate, hoursSaved]);
  const price = 799;
  const roi = useMemo(() => ((monthlySavings - price) / price) * 100, [monthlySavings]);

  return (
    <section id="roi" className="py-8 md:py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">ROI Calculator</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamSize">Team size</Label>
                <Input id="teamSize" type="number" min={1} value={teamSize} onChange={(e) => setTeamSize(parseInt(e.target.value || "0"))} />
              </div>
              <div>
                <Label htmlFor="hourlyRate">Average hourly rate ($)</Label>
                <Input id="hourlyRate" type="number" min={1} value={hourlyRate} onChange={(e) => setHourlyRate(parseInt(e.target.value || "0"))} />
              </div>
              <div>
                <Label>Hours saved per person per week</Label>
                <div className="pt-4">
                  <Slider value={[hoursSaved]} min={1} max={20} step={1} onValueChange={(v) => setHoursSaved(v[0])} />
                </div>
                <div className="text-sm text-muted-foreground mt-2">Currently: {hoursSaved} hours</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Estimated monthly time savings</div>
                <div className="text-4xl font-bold">${monthlySavings.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">RegIQ Enterprise</div>
                <div className="text-2xl font-semibold">$799/month</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Estimated ROI</div>
                <div className={roi >= 0 ? "text-3xl font-bold text-green-600" : "text-3xl font-bold text-red-600"}>
                  {roi >= 0 ? "+" : ""}{roi.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Assumes 4 weeks/month. For illustration only.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ROICalculator;

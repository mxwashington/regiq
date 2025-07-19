
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Clock, 
  Shield, 
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Globe
} from "lucide-react";

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  description: string;
  trend?: string;
  color: string;
}

const stats: Stat[] = [
  {
    icon: FileText,
    value: "10M+",
    label: "Documents Monitored",
    description: "Regulatory documents tracked across all agencies",
    trend: "+15% this month",
    color: "text-blue-600"
  },
  {
    icon: Clock,
    value: "90%",
    label: "Time Saved",
    description: "Reduction in manual regulatory monitoring",
    trend: "Consistent performance",
    color: "text-green-600"
  },
  {
    icon: Shield,
    value: "99.9%",
    label: "Compliance Accuracy",
    description: "Accuracy in identifying relevant regulations",
    trend: "+2% improvement",
    color: "text-primary"
  },
  {
    icon: Users,
    value: "5,000+",
    label: "Compliance Professionals",
    description: "Trust RegIQ for regulatory intelligence",
    trend: "+25% growth",
    color: "text-purple-600"
  },
  {
    icon: AlertTriangle,
    value: "95%",
    label: "Alert Relevance",
    description: "Of alerts are actionable and relevant",
    trend: "Industry leading",
    color: "text-orange-600"
  },
  {
    icon: Globe,
    value: "50+",
    label: "Regulatory Sources",
    description: "Agencies and sources monitored globally",
    trend: "Expanding coverage",
    color: "text-cyan-600"
  }
];

export const StatsSection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary/5 to-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <TrendingUp className="h-3 w-3 mr-1" />
            Proven Results
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            RegIQ by the Numbers
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join thousands of compliance professionals who rely on RegIQ for accurate, 
            timely regulatory intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-muted/50 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  {stat.trend && (
                    <Badge variant="outline" className="text-xs">
                      {stat.trend}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="font-semibold text-foreground">
                    {stat.label}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stat.description}
                  </p>
                </div>

                {/* Subtle background pattern */}
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon className="h-16 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional CTA */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Trusted by Fortune 500 companies and growing startups</span>
          </div>
        </div>
      </div>
    </section>
  );
};

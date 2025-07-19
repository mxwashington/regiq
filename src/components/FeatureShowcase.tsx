
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Zap, 
  Shield, 
  Bell, 
  Search, 
  BarChart3,
  Clock,
  Filter
} from "lucide-react";

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  metrics: string;
  highlight: string;
}

const features: Feature[] = [
  {
    icon: Brain,
    title: "AI-Powered Summarization",
    description: "Transform complex regulatory documents into clear, actionable summaries with risk scoring",
    metrics: "90% time saved on document review",
    highlight: "Reduces review time from hours to minutes"
  },
  {
    icon: Zap,
    title: "Real-Time Monitoring",
    description: "Continuous monitoring of FDA, USDA, EPA, and other key agencies with instant updates",
    metrics: "24/7 monitoring of 50+ sources",
    highlight: "Never miss a critical regulatory change"
  },
  {
    icon: Bell,
    title: "Smart Alert System",
    description: "Personalized notifications based on your industry, keywords, and compliance priorities",
    metrics: "95% accuracy in relevant alerts",
    highlight: "Only get alerts that matter to your business"
  },
  {
    icon: Search,
    title: "Advanced Search & Filtering",
    description: "Powerful search tools to focus on regulations that matter to your business",
    metrics: "Search across 10M+ documents",
    highlight: "Find what you need in seconds, not hours"
  }
];

export const FeatureShowcase = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Powerful Features for Modern Compliance Teams
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how RegIQ transforms regulatory monitoring with cutting-edge technology
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {feature.metrics}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {feature.highlight}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

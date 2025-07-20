
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Zap, 
  Bell, 
  Search
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
    description: "Transform complex regulatory documents into clear, actionable summaries",
    metrics: "Save time on document review",
    highlight: "Get the key points without reading everything"
  },
  {
    icon: Zap,
    title: "Real-Time Monitoring",
    description: "Continuous monitoring of FDA, USDA, EPA, and other key agencies",
    metrics: "Monitor key regulatory sources",
    highlight: "Stay informed as changes happen"
  },
  {
    icon: Bell,
    title: "Smart Alert System",
    description: "Get notifications for regulations that matter to your work",
    metrics: "Personalized notifications",
    highlight: "Focus on what's relevant to you"
  },
  {
    icon: Search,
    title: "Easy Search & Filtering",
    description: "Simple tools to find regulations that matter to your business",
    metrics: "Quick search capabilities",
    highlight: "Find what you need quickly"
  }
];

export const FeatureShowcase = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Simple Tools for Compliance Teams
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Basic features to help you stay informed about regulatory changes
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

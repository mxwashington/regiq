
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Monitor, Smartphone, Tablet, ChevronRight } from "lucide-react";

// Import generated mockups
import dashboardMockup from "@/assets/dashboard-mockup.jpg";
import analyticsMockup from "@/assets/analytics-mockup.jpg";
import alertsMockup from "@/assets/alerts-mockup.jpg";
import searchMockup from "@/assets/search-mockup.jpg";

interface Screenshot {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  features: string[];
  agencies: string[];
}

const screenshots: Screenshot[] = [
  {
    id: "dashboard",
    title: "Regulatory Intelligence Dashboard",
    description: "Real-time monitoring of FDA, USDA, EPA, and other regulatory agencies with AI-powered insights",
    category: "Dashboard",
    imageUrl: dashboardMockup,
    features: ["Real-time Updates", "AI Summaries", "Risk Scoring", "Custom Alerts"],
    agencies: ["FDA", "USDA", "EPA", "EMA"]
  },
  {
    id: "analytics",
    title: "Advanced Analytics & Reporting",
    description: "Comprehensive analytics dashboard showing regulatory trends and compliance metrics",
    category: "Analytics",
    imageUrl: analyticsMockup,
    features: ["Trend Analysis", "Compliance Metrics", "Export Reports", "Custom Dashboards"],
    agencies: ["FDA", "USDA", "EPA"]
  },
  {
    id: "alerts",
    title: "Smart Alert Management",
    description: "Personalized notification system with intelligent filtering and priority scoring",
    category: "Alerts",
    imageUrl: alertsMockup,
    features: ["Smart Filtering", "Priority Scoring", "Custom Keywords", "Team Notifications"],
    agencies: ["FDA", "USDA", "EPA", "EMA", "FSIS"]
  },
  {
    id: "search",
    title: "Powerful Search & Discovery",
    description: "Advanced search capabilities with AI-enhanced filtering across all regulatory sources",
    category: "Search",
    imageUrl: searchMockup,
    features: ["AI Search", "Advanced Filters", "Saved Searches", "Bulk Export"],
    agencies: ["FDA", "USDA", "EPA", "EMA"]
  }
];

export const ScreenshotGallery = () => {
  const [activeDevice, setActiveDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", ...Array.from(new Set(screenshots.map(s => s.category)))];
  const filteredScreenshots = selectedCategory === "All" 
    ? screenshots 
    : screenshots.filter(s => s.category === selectedCategory);

  const getDeviceClass = () => {
    switch (activeDevice) {
      case "tablet":
        return "max-w-2xl mx-auto";
      case "mobile":
        return "max-w-sm mx-auto";
      default:
        return "max-w-5xl mx-auto";
    }
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-muted/30 to-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">See RegIQ in Action</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Explore our powerful regulatory intelligence platform through interactive screenshots
          </p>
          
          {/* Device Toggle */}
          <div className="flex justify-center gap-2 mb-8">
            <Button
              variant={activeDevice === "desktop" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveDevice("desktop")}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              Desktop
            </Button>
            <Button
              variant={activeDevice === "tablet" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveDevice("tablet")}
              className="flex items-center gap-2"
            >
              <Tablet className="h-4 w-4" />
              Tablet
            </Button>
            <Button
              variant={activeDevice === "mobile" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveDevice("mobile")}
              className="flex items-center gap-2"
            >
              <Smartphone className="h-4 w-4" />
              Mobile
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Screenshot Carousel */}
        <div className={getDeviceClass()}>
          <Carousel className="w-full">
            <CarouselContent>
              {filteredScreenshots.map((screenshot) => (
                <CarouselItem key={screenshot.id}>
                  <Card className="overflow-hidden border-0 shadow-xl">
                    <div className="relative">
                      <img
                        src={screenshot.imageUrl}
                        alt={screenshot.title}
                        className="w-full h-96 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-primary-foreground">
                        <h3 className="text-xl font-semibold mb-2">{screenshot.title}</h3>
                        <p className="text-sm opacity-90 mb-3">{screenshot.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {screenshot.agencies.map((agency) => (
                            <Badge 
                              key={agency} 
                              variant="secondary" 
                              className={`text-xs ${
                                agency === 'FDA' ? 'border-agency-fda text-agency-fda' :
                                agency === 'USDA' ? 'border-agency-usda text-agency-usda' :
                                agency === 'EPA' ? 'border-agency-epa text-agency-epa' :
                                agency === 'EMA' ? 'border-agency-ema text-agency-ema' :
                                'border-muted'
                              }`}
                            >
                              {agency}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {screenshot.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="h-3 w-3 text-primary" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Button size="lg" className="mr-4">
            Start Free Trial
          </Button>
          <Button variant="outline" size="lg">
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, Clock, DollarSign, Search, Smartphone, Brain, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export const LandingPageCopy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto text-center max-w-6xl">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl text-primary">RegIQ</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/pricing">Get Started</Link>
              </Button>
            </nav>
          </div>

          {/* Primary Headline (ROI-focused) */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
            Stop Losing <span className="text-primary">$34,487 Per Year</span> on Failed Regulatory Searches
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-3xl mx-auto px-4">
            Food regulatory professionals waste <strong>15.5 hours weekly</strong> on searches that fail 30-70% of the time. RegIQ's AI-powered platform delivers instant, plain-English answers to FDA/USDA questions.
          </p>

          <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-6 md:mb-8 px-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
                <Link to="/pricing">
                  Get Early Access <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
                <a href="https://calendly.com/marcus-regiq" target="_blank" rel="noopener noreferrer">
                  See a Demo
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-8">
            The Hidden Cost of Regulatory Confusion
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="p-6">
              <CardContent className="space-y-4 p-0">
                <div className="flex items-center space-x-3">
                  <Clock className="h-8 w-8 text-destructive" />
                  <h3 className="text-xl font-semibold">Cross-Agency Chaos</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>95% of food companies</strong> struggle with FDA/USDA jurisdictional overlaps, losing <strong>195 hours annually</strong> per regulatory professional just trying to figure out which agency governs their products.
                </p>
                <p className="text-sm text-muted-foreground">
                  Pet food companies face the worst regulatory chaos, losing <strong>217 hours annually</strong> navigating state-by-state approval systems.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent className="space-y-4 p-0">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-8 w-8 text-destructive" />
                  <h3 className="text-xl font-semibold">Search Failures Cost Fortune</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Regulatory databases have <strong>30-70% failure rates</strong> for food-specific searches. Professionals spend <strong>15.5 hours weekly</strong> on regulatory research, costing <strong>$34,487 per professional annually</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  That's <strong>806 hours per year</strong> of wasted productivity per regulatory professional.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center space-y-4">
            <Badge variant="destructive" className="text-sm px-4 py-2">
              75% of companies struggle with conflicting state vs federal requirements
            </Badge>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Small food manufacturers (under 50 employees) face regulatory compliance costs of <strong>$50,000 per employee annually</strong>—nearly double the cost of large firms.
            </p>
          </div>
        </div>
      </section>

      {/* Market Opportunity Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-8">
            A $448 Million Market Opportunity
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">26,000</div>
              <p className="text-muted-foreground">Regulatory professionals in mid-market food companies</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">40.6%</div>
              <p className="text-muted-foreground">Of work year lost to search inefficiencies</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">$448M</div>
              <p className="text-muted-foreground">Total addressable market for food regulatory intelligence</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            The regulatory intelligence market for food-specific solutions is massive and underserved. Current tools weren't built for the unique challenges of food manufacturing.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              RegIQ: Built Specifically for Food Regulatory Intelligence
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We solve every pain point with AI-powered technology designed for food manufacturing professionals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="p-6 text-center">
              <CardContent className="space-y-4 p-0">
                <Brain className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold">AI-Powered Summaries</h3>
                <p className="text-sm text-muted-foreground">
                  Plain-English interpretations of complex CFR requirements. No more legal jargon.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center">
              <CardContent className="space-y-4 p-0">
                <Search className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold">Natural Language Search</h3>
                <p className="text-sm text-muted-foreground">
                  Search using product terms like "pet food salmonella testing" instead of regulation codes.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center">
              <CardContent className="space-y-4 p-0">
                <Smartphone className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold">Mobile-First Design</h3>
                <p className="text-sm text-muted-foreground">
                  60% of compliance happens on plant floors. Access regulatory answers anywhere.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center">
              <CardContent className="space-y-4 p-0">
                <Zap className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold">ERP/QMS Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Seamless integration with your existing quality management systems.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-primary/10 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4 text-center">RegIQ Eliminates All 10 Pain Points</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Cross-agency confusion resolution</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Natural language product searches</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>State vs federal conflict mapping</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Pet food regulatory navigation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>High-success search algorithms</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Mobile plant floor access</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>ERP/QMS system integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>AI regulatory summarization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Small company cost optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Massive time savings delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-8">
            Trusted by Food Industry Leaders
          </h2>
          <div className="bg-muted/30 rounded-lg p-8 mb-8">
            <p className="text-lg italic text-muted-foreground mb-4">
              "Placeholder for customer testimonials highlighting time savings, cost reduction, and improved compliance confidence. Focus on quantifiable results and specific use cases."
            </p>
            <div className="text-sm text-muted-foreground">
              - [Customer Name], [Title] at [Food Company]
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Space for industry endorsements, case studies, and logo wall of major food manufacturers using RegIQ.
          </p>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-12 px-4 bg-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Stop Wasting $34,487 Per Professional Per Year
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the regulatory intelligence revolution. Get instant FDA/USDA answers in plain English, on any device, integrated with your systems.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button size="lg" className="px-8 py-4 text-lg" asChild>
              <Link to="/pricing">
                Get Early Access <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg" asChild>
              <a href="https://calendly.com/marcus-regiq" target="_blank" rel="noopener noreferrer">
                See a Demo
              </a>
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Start free, no credit card</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>ROI guarantee</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Alternative Headlines for A/B Testing:

/* 
1. PROBLEM-FOCUSED:
   Headline: "Food Manufacturers Waste 195 Hours Annually on Broken Regulatory Search"
   Sub-headline: "95% of food companies can't find the FDA/USDA answers they need. RegIQ's AI platform delivers instant, accurate regulatory intelligence in plain English."

2. SOLUTION-FOCUSED:
   Headline: "The First AI-Powered Regulatory Intelligence Platform Built for Food Manufacturing"
   Sub-headline: "Get instant FDA/USDA answers in plain English. Natural language search, mobile access, and ERP integration designed specifically for food regulatory professionals."

3. ROI-FOCUSED (Current):
   Headline: "Stop Losing $34,487 Per Year on Failed Regulatory Searches"
   Sub-headline: "Food regulatory professionals waste 15.5 hours weekly on searches that fail 30-70% of the time. RegIQ's AI-powered platform delivers instant, plain-English answers to FDA/USDA questions."
*/

export default LandingPageCopy;
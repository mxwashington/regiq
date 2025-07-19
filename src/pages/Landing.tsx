
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Zap, Bell, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { StatsSection } from "@/components/StatsSection";
import { ConversationalChatbot } from "@/components/ConversationalChatbot";
import { CookieConsent } from "@/components/CookieConsent";
import { useState } from "react";

const Landing = () => {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl">RegIQ</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#screenshots" className="text-muted-foreground hover:text-foreground transition-colors">Platform</a>
            <Link to="/subscription" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            {user ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth">Start Free Trial</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered Regulatory Intelligence
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Transform Regulatory 
            <span className="text-primary"> Complexity</span> into 
            <span className="text-primary"> Clarity</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            RegIQ aggregates regulatory updates from FDA, USDA, EPA and more, delivering AI-enhanced intelligence that keeps your compliance team ahead of critical changes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild>
              <Link to={user ? "/dashboard" : "/auth"}>
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg">Watch Demo</Button>
          </div>
          
          {/* Agency Badges */}
          <div className="flex flex-wrap justify-center gap-4 opacity-60">
            <Badge variant="outline" className="text-agency-fda border-agency-fda">FDA</Badge>
            <Badge variant="outline" className="text-agency-usda border-agency-usda">USDA</Badge>
            <Badge variant="outline" className="text-agency-epa border-agency-epa">EPA</Badge>
            <Badge variant="outline" className="text-agency-ema border-agency-ema">EMA</Badge>
            <Badge variant="outline">FSIS</Badge>
            <Badge variant="outline">EFSA</Badge>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* Screenshot Gallery */}
      <div id="screenshots">
        <ScreenshotGallery />
      </div>

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to stay compliant</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Replace manual monitoring of dozens of regulatory sources with one intelligent dashboard
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Real-Time Aggregation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Continuous monitoring of FDA, USDA, EPA, and other key agencies with instant updates
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">AI Summarization</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Complex regulatory documents transformed into clear, actionable summaries with risk scoring
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Bell className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Smart Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Personalized notifications based on your industry, keywords, and compliance priorities
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Advanced Filtering</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Powerful search and filter tools to focus on regulations that matter to your business
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to simplify regulatory monitoring?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of compliance professionals who trust RegIQ to keep them informed and compliant.
          </p>
          <Button size="lg" asChild>
            <Link to={user ? "/dashboard" : "/auth"}>
              Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold">RegIQ</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/legal" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Privacy & Legal
            </Link>
            <p className="text-muted-foreground text-sm">
              © 2024 RegIQ. Regulatory intelligence for the modern compliance team.
            </p>
          </div>
        </div>
      </footer>

      {/* Chatbot */}
      <ConversationalChatbot 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />

      {/* Cookie Consent */}
      <CookieConsent />
    </div>
  );
};

export default Landing;

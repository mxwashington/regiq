
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Zap, Bell, Brain, Clock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { MobileNavigation } from "@/components/MobileNavigation";

import { FeatureShowcase } from "@/components/FeatureShowcase";
import { ConversationalChatbot } from "@/components/ConversationalChatbot";
import { CookieConsent } from "@/components/CookieConsent";
import { useState, lazy, Suspense } from "react";

// Lazy load heavy components
const DemoInteractiveDashboard = lazy(() => import("@/components/DemoInteractiveDashboard").then(m => ({ default: m.DemoInteractiveDashboard })));

const Landing = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const getDashboardUrl = () => {
    return isAdmin ? "/admin/dashboard" : "/dashboard";
  };
  
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
            <a href="#platform" className="text-muted-foreground hover:text-foreground transition-colors">Platform</a>
            {user ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={getDashboardUrl()}>Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth">Get Started Free</Link>
                </Button>
              </>
            )}
          </nav>
          <MobileNavigation />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          {/* Live Status Indicator */}
          <div className="mb-6">
            <Badge variant="secondary" className="mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live • Updated 19 minutes ago
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-primary">
            Regulatory News,<br />Minus the Noise
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-powered regulatory alerts for food, ag, and pharma compliance teams. See what's happening right now.
          </p>
          
          <div className="space-y-4 mb-12">
            <Button size="lg" className="w-full md:w-auto px-8 py-3" asChild>
              <Link to={user ? getDashboardUrl() : "/auth"}>
                Get Personalized Alerts
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" className="w-full md:w-auto px-8 py-3">
              How it Works
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How it Works</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Monitoring</h3>
              <p className="text-muted-foreground">
                Aggregate FDA, USDA, EPA feeds automatically
              </p>
            </Card>
            
            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Summaries</h3>
              <p className="text-muted-foreground">
                Complex documents simplified into actionable insights
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Alerts Preview */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Latest Regulatory Updates</h2>
            <p className="text-muted-foreground">See what's happening in real-time</p>
          </div>
          <Suspense fallback={
            <div className="flex items-center justify-center h-48 border rounded-lg bg-muted/20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <DemoInteractiveDashboard />
          </Suspense>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to simplify regulatory monitoring?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Start getting free regulatory alerts today. No credit card required.
          </p>
          <Button size="lg" asChild>
            <Link to={user ? getDashboardUrl() : "/auth"}>
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
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

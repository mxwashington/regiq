
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Zap, Bell, Brain, Database, Cloud, Lock, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MobileNavigation } from "@/components/MobileNavigation";

import { FeatureShowcase } from "@/components/FeatureShowcase";
import { StatsSection } from "@/components/StatsSection";
import { ConversationalChatbot } from "@/components/ConversationalChatbot";
import { CookieConsent } from "@/components/CookieConsent";
import { DemoInteractiveDashboard } from "@/components/DemoInteractiveDashboard";
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
            <a href="#platform" className="text-muted-foreground hover:text-foreground transition-colors">Platform</a>
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
          <MobileNavigation />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center max-w-6xl">
          <Badge variant="secondary" className="mb-4">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered Regulatory Intelligence
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Transform Regulatory 
            <span className="text-primary"> Complexity</span> into 
            <span className="text-primary"> Clarity</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore our live regulatory intelligence platform. Search, filter, and analyze real FDA, USDA, and EPA alerts below.
          </p>
          
          {/* Agency Badges */}
          <div className="flex flex-wrap justify-center gap-4 opacity-60 mb-8">
            <Badge variant="outline" className="text-agency-fda border-agency-fda">FDA</Badge>
            <Badge variant="outline" className="text-agency-usda border-agency-usda">USDA</Badge>
            <Badge variant="outline" className="text-agency-epa border-agency-epa">EPA</Badge>
            <Badge variant="outline" className="text-agency-ema border-agency-ema">EMA</Badge>
            <Badge variant="outline">FSIS</Badge>
            <Badge variant="outline">EFSA</Badge>
          </div>
        </div>
      </section>

      {/* Interactive Demo Dashboard */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Try RegIQ Now - Live Demo</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              This is a fully functional demo with real regulatory data. Click, search, and explore to experience RegIQ's powerful capabilities firsthand.
            </p>
          </div>
          <DemoInteractiveDashboard />
        </div>
      </section>

      {/* Platform Section */}
      <section id="platform" className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for Enterprise Scale</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our robust platform architecture delivers reliable, secure, and scalable regulatory intelligence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-2">
              <CardHeader>
                <Cloud className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl">Cloud-Native Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Built on AWS with 99.9% uptime SLA, automatic scaling, and global CDN for lightning-fast access worldwide
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-2">
              <CardHeader>
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl">Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  SOC 2 Type II certified with end-to-end encryption, SSO integration, and role-based access controls
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-2">
              <CardHeader>
                <Database className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-xl">Real-Time Data Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Advanced ETL processes monitor 50+ regulatory sources with sub-minute latency and 99.99% accuracy
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Integration & API Section */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4">Seamless Integrations</h3>
              <p className="text-muted-foreground">
                Connect RegIQ with your existing compliance and business systems
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  REST API & Webhooks
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Comprehensive REST API for all platform features</li>
                  <li>• Real-time webhooks for instant notifications</li>
                  <li>• Rate limiting and authentication included</li>
                  <li>• SDKs available for popular languages</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Enterprise Connectors
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Salesforce, ServiceNow, Jira integration</li>
                  <li>• Slack, Teams, and email notifications</li>
                  <li>• Custom SAML/OIDC authentication</li>
                  <li>• On-premise deployment options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

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

import React, { useState, useMemo } from "react";
import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowRight, Shield, Zap, Bell, Brain, Clock, TrendingUp, ExternalLink, Filter, Search, AlertCircle, Globe, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { MobileLayout } from "@/components/MobileLayout";
import { MobileAlertCard } from "@/components/MobileAlertCard";
import { MobileSearchInterface } from "@/components/MobileSearchInterface";
import { MobileButton } from "@/components/MobileButton";
import { useMobileOptimization } from "@/hooks/useMobileOptimization";
// Removed alert-related imports
import { ConversationalChatbot } from "@/components/ConversationalChatbot";
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';

// Removed alert component imports
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Hero } from "@/components/marketing/Hero";

import { AlertsOnlyPricingSection } from "@/components/marketing/AlertsOnlyPricingSection";
import { ROICalculator } from "@/components/marketing/ROICalculator";
import { SocialProof } from "@/components/marketing/SocialProof";

const Landing = () => {
  console.log('Landing component is loading - updated version!');
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const { trackInteraction } = useAnalytics();
  const [email, setEmail] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { isMobile, isTablet } = useMobileOptimization();
  
  const getDashboardUrl = () => {
    return isAdmin ? "/admin/dashboard" : "/dashboard";
  };

  // Removed alert filtering logic

  // Removed alert utility functions

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement email signup
    console.log('Signup with email:', email);
  };

  // Removed alert interaction handlers


  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>195 hours lost to broken regulatory search | RegIQ</title>
        <meta name="description" content="95% can't find answers. $34,487 wasted per professional. FDA/USDA confusion. Mobile-first. 7-day free trial — no credit card." />
        <meta name="keywords" content="food manufacturing compliance, FDA USDA EPA search, HACCP, plant floor, regulatory search" />
        <link rel="canonical" href="https://regiq.com" />
        
        {/* Dynamic structured data for homepage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "RegIQ",
            "url": "https://regiq.com",
            "description": "Real-time FDA, USDA, EPA regulatory alerts and compliance monitoring",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://regiq.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            },
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "RegIQ Regulatory Monitoring",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "AggregateOffer",
                "lowPrice": "99",
                "highPrice": "799",
                "priceCurrency": "USD"
              }
            }
          })}
        </script>

        {/* Organization structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "RegIQ",
            "description": "AI-powered regulatory intelligence platform",
            "url": "https://regiq.com",
            "logo": "https://regiq.com/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "areaServed": "US"
            }
          })}
        </script>
      </Helmet>
      
      {/* Marketing Hero */}
      <Hero />

      {/* Pain Points Section */}
      <section id="pain-points" className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 hyphens-none">The Hidden Federal Compliance Crisis</h2>
          <ul className="text-muted-foreground grid gap-2 text-sm md:text-base leading-relaxed list-disc pl-5 hyphens-none">
            <li>Failed searches cost $34,487 per compliance professional annually</li>
            <li><span className="whitespace-nowrap">Cross-agency confusion</span> costs companies 195 hours per professional searching for answers</li>
            <li><span className="whitespace-nowrap">Pet food manufacturers</span> lose 217 hours annually navigating FDA/USDA dual jurisdiction</li>
            <li>Current regulatory databases have <span className="whitespace-nowrap">30–70% failure rates</span> for <span className="whitespace-nowrap">food‑specific searches</span></li>
            <li>60% of compliance decisions happen on plant floors—but existing tools aren't <span className="whitespace-nowrap">mobile‑optimized</span></li>
          </ul>
          <p className="text-muted-foreground text-sm md:text-base mt-3 hyphens-none">The current system is broken. RegIQ fixes it.</p>
        </div>
      </section>


      <SocialProof />
      {/* Solution Section */}
      <section id="solution" className="py-8 md:py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 hyphens-none">Purpose-built for food manufacturing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2 hyphens-none">Natural language search that actually works</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed hyphens-none">Ask <span className="whitespace-nowrap">"pet food salmonella testing"</span> instead of memorizing "21 CFR 501"—get results that make sense to food professionals, not lawyers.</p>
            </article>
            <article className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2 hyphens-none"><span className="whitespace-nowrap">Cross-agency</span> jurisdiction clarity</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed hyphens-none">Navigate FDA vs USDA oversight confusion—know instantly whether pizza falls under FDA but pizza with pepperoni requires FSIS compliance.</p>
            </article>
            <article className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2 hyphens-none">Plain English regulatory summaries</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed hyphens-none">AI converts complex CFR requirements into actionable guidance your team can actually use.</p>
            </article>
            <article className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Import/export federal compliance</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Multi-agency requirements (FDA, USDA, CBP) unified for seamless international trade compliance.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Competitive Differentiation */}
      <section id="competitive" className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 hyphens-none">Why Generic Compliance Tools Fail Food Manufacturing</h2>
          <div className="space-y-2 text-sm md:text-base text-muted-foreground hyphens-none">
            <p>❌ LexisNexis: <span className="whitespace-nowrap">Healthcare-focused</span>, requires legal expertise, $75K+ annually</p>
            <p>❌ Thomson Reuters: Banking regulations, complex UI, <span className="whitespace-nowrap">no mobile access</span></p>
            <p>❌ Government websites: <span className="whitespace-nowrap">30-70% search failure rate</span>, <span className="whitespace-nowrap">no cross-referencing</span></p>
            <p>✅ RegIQ: <span className="whitespace-nowrap">Purpose-built</span> for food manufacturing, <span className="whitespace-nowrap">mobile-first</span>, starts at $99/month</p>
          </div>
        </div>
      </section>

      

      {/* NEW FEATURES ANNOUNCEMENT - MOVED UP FOR PROMINENCE */}
      <section id="new-features" className="py-12 md:py-16 px-4 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/10 border-y-2 border-primary/20">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <Badge variant="default" className="mb-4 text-base px-4 py-2">🚀 NEW: Complete Compliance Suite</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">6 Powerful New Features Just Launched</h2>
            <p className="text-muted-foreground text-lg md:text-xl">Task Management • Compliance Calendar • AI Assistant • Enhanced Analytics • Supplier Risk Monitoring • Regulatory Impact Analysis</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">ALL PLANS</Badge>
                </div>
                <CardTitle className="text-lg">Task Management System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Create, assign, and track compliance tasks with deadlines and priority levels.</p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">ALL PLANS</Badge>
                </div>
                <CardTitle className="text-lg">Compliance Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Never miss a deadline with automated reminders and recurring compliance tasks.</p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">PROFESSIONAL+</Badge>
                </div>
                <CardTitle className="text-lg">AI Compliance Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Get instant answers to complex regulatory questions with AI-powered intelligence.</p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">PROFESSIONAL+</Badge>
                </div>
                <CardTitle className="text-lg">Enhanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Compliance maturity scoring, cost analysis, and industry benchmarking.</p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">PROFESSIONAL+</Badge>
                </div>
                <CardTitle className="text-lg">Supplier Risk Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Automated risk scoring for your suppliers based on regulatory alerts.</p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">PROFESSIONAL+</Badge>
                </div>
                <CardTitle className="text-lg">Regulatory Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">AI-powered business impact scoring with actionable recommendations.</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-8">
            <Button size="lg" className="mb-2" asChild>
              <Link to="/pricing">
                Start 7-Day Free Trial - All Features Included
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">No credit card required • Cancel anytime</p>
          </div>
        </div>
      </section>

      <AlertsOnlyPricingSection />

      <ROICalculator />

      {/* Value Proposition */}
      <section className="py-6 md:py-8 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">AI-powered intelligence with Perplexity</h3>
              <p className="text-sm md:text-base text-muted-foreground">Instant regulatory insights with live sources</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2 hyphens-none"><span className="whitespace-nowrap">Cross-agency</span> food monitoring</h3>
              <p className="text-sm md:text-base text-muted-foreground hyphens-none">FDA, USDA, EPA, CDC in one place</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">Plain English summaries</h3>
              <p className="text-sm md:text-base text-muted-foreground">No regulatory jargon, food-focused</p>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Industry Solutions</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Specialized Compliance for Every Food Manufacturing Segment
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Each food industry has unique regulatory requirements. RegIQ provides tailored 
              compliance monitoring for your specific manufacturing segment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link to="/industries/dairy-manufacturing" className="group hover:no-underline">
              <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer h-full">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    🥛
                  </div>
                  <CardTitle className="text-lg">Dairy Manufacturing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Grade A PMO compliance, pasteurization standards, and 21 CFR 131 dairy regulations.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>✓ Grade A PMO monitoring</li>
                    <li>✓ Pasteurization alerts</li>
                    <li>✓ Dairy standards tracking</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link to="/industries/meat-poultry" className="group hover:no-underline">
              <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer h-full">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    🥩
                  </div>
                  <CardTitle className="text-lg">Meat & Poultry</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    USDA FSIS regulations, HACCP requirements, and pathogen testing compliance.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>✓ USDA FSIS alerts</li>
                    <li>✓ Pathogen monitoring</li>
                    <li>✓ HACCP compliance</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link to="/industries/packaged-foods" className="group hover:no-underline">
              <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer h-full">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    📦
                  </div>
                  <CardTitle className="text-lg">Packaged Foods</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    FSMA Preventive Controls, allergen management, and nutritional labeling.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>✓ FSMA compliance</li>
                    <li>✓ Allergen tracking</li>
                    <li>✓ Label requirements</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            <Link to="/industries/beverage-production" className="group hover:no-underline">
              <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer h-full">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    🧃
                  </div>
                  <CardTitle className="text-lg">Beverage Production</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Juice HACCP, bottled water standards, and acidified foods requirements.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>✓ Juice HACCP</li>
                    <li>✓ Water standards</li>
                    <li>✓ Acidified foods</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="text-center">
            <Button size="lg" variant="outline" asChild>
              <Link to="/solutions/food-safety-compliance">
                View All Solutions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Live Dashboard Preview section removed */}

      {/* Food Industry Trust Section */}
      <section className="py-8 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Official Government Data • No Delays, No Filtering</h3>
            <p className="text-muted-foreground mb-6">Direct agency feeds monitored continuously for food safety teams</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-blue-500 mobile-container-safe center-mobile">
                <div className="text-2xl mb-2">🛡️</div>
                <div className="font-medium text-blue-700 mobile-text-content break-words-mobile">FDA</div>
                <div className="text-sm text-muted-foreground mobile-text-content break-words-mobile">Food Safety Authority</div>
              </div>
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-green-500 mobile-container-safe center-mobile">
                <div className="text-2xl mb-2">🌾</div>
                <div className="font-medium text-green-700 mobile-text-content break-words-mobile">USDA</div>
                <div className="text-sm text-muted-foreground mobile-text-content break-words-mobile">Agriculture & Meat Safety</div>
              </div>
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-emerald-500 mobile-container-safe center-mobile">
                <div className="text-2xl mb-2">🌿</div>
                <div className="font-medium text-emerald-700 mobile-text-content break-words-mobile">EPA</div>
                <div className="text-sm text-muted-foreground mobile-text-content break-words-mobile">Environmental Protection</div>
              </div>
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-red-500 mobile-container-safe center-mobile">
                <div className="text-2xl mb-2">⚕️</div>
                <div className="font-medium text-red-700 mobile-text-content break-words-mobile">CDC</div>
                <div className="text-sm text-muted-foreground mobile-text-content break-words-mobile">Public Health Alerts</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span>✅ Real-time Government Data</span>
            <span>✅ Built by Food Industry Professionals</span>
            <span>✅ 7-day free trial • Cancel anytime</span>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Direct government data feeds for food safety compliance
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">Three steps to faster, confident decisions on the plant floor</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Search className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3">1. Ask in plain language</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Use product or process terms—no “21 CFR” expertise required.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Brain className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3">2. We normalize across agencies</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Unified FDA/USDA/EPA results with the right authority, guidance, and HACCP implications.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Bell className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3">3. You act with confidence</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Prioritized actions with citations, summaries, and next steps you can share with QA and operations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Email Signup Section */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-4 md:p-6 lg:p-8 mobile-container-safe mobile-card-content">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 mobile-text-content break-words-mobile center-mobile hyphens-none">Stop wasting 195 hours on <span className="whitespace-nowrap">broken regulatory</span> search</h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6 mobile-text-content break-words-mobile center-mobile hyphens-none">Purpose-built for food manufacturing—mobile-first, cross-agency clarity.</p>

            <div className="flex flex-col gap-2 justify-center items-center">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/pricing">Start Free Trial</Link>
              </Button>
              <p className="text-sm text-muted-foreground">7-day free trial • Cancel anytime • No credit card required</p>
            </div>

            <div className="text-xs md:text-sm text-muted-foreground mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-w-2xl mx-auto">
                <span>✅ Food-specific, not generic compliance</span>
                <span>✅ Mobile-first for plant floors</span>
                <span>✅ Unified FDA/USDA/EPA search</span>
                <span>✅ SMB-accessible pricing</span>
              </div>
            </div>
          </Card>
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
              Built for food industry professionals by food industry experts
            </p>
          </div>
        </div>
      </footer>

      {/* Chatbot */}
      <ConversationalChatbot 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />

    </div>
  );
};

export default Landing;

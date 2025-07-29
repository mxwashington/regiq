import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Shield, Zap, Bell, Brain, Clock, TrendingUp, ExternalLink, Filter, Search, AlertCircle, Globe, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { MobileLayout } from "@/components/MobileLayout";
import { MobileAlertCard } from "@/components/MobileAlertCard";
import { MobileSearchInterface } from "@/components/MobileSearchInterface";
import { MobileButton } from "@/components/MobileButton";
import { useMobileOptimization } from "@/hooks/useMobileOptimization";
import { useSimpleAlerts } from "@/hooks/useSimpleAlerts";
import { useSavedAlerts } from "@/hooks/useSavedAlerts";
import { formatDistanceToNow } from "date-fns";
import { ConversationalChatbot } from "@/components/ConversationalChatbot";
import { CookieConsent } from "@/components/CookieConsent";
import { DataRefreshButton } from "@/components/DataRefreshButton";
import { TestDataRunner } from "@/components/TestDataRunner";
import { AlertSourceFinder } from "@/components/AlertSourceFinder";
import PerplexityAlertCard from "@/components/PerplexityAlertCard";
import { AlertSourceSearchDemo } from "@/components/AlertSourceSearchDemo";
import { KeywordExtractionDemo } from "@/components/KeywordExtractionDemo";
import { searchForAlert, isValidSourceUrl } from "@/lib/alert-search";
import { Helmet } from 'react-helmet-async';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';

const Landing = () => {
  console.log('Landing component is loading - updated version!');
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const { trackInteraction } = useAnalytics();
  const [email, setEmail] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { alerts, loading } = useSimpleAlerts();
  const { savedAlerts, toggleSaveAlert } = useSavedAlerts();
  const { isMobile, isTablet } = useMobileOptimization();
  
  const getDashboardUrl = () => {
    return isAdmin ? "/admin/dashboard" : "/dashboard";
  };

  // Get featured alert (highest priority)
  const featuredAlert = useMemo(() => {
    const highPriorityAlerts = alerts.filter(alert => 
      alert.urgency?.toLowerCase() === 'high' || alert.urgency?.toLowerCase() === 'critical'
    );
    return highPriorityAlerts[0] || alerts[0];
  }, [alerts]);

  // Get filtered alerts for display - Default to food agencies
  const displayAlerts = useMemo(() => {
    console.log('Filtering alerts:', { 
      totalAlerts: alerts.length, 
      selectedAgency, 
      sampleSources: alerts.slice(0, 3).map(a => a.source) 
    });
    
    if (!selectedAgency) {
      // Default to food agencies only (FDA, USDA, EPA, CDC)
      const foodAgencies = ['FDA', 'USDA', 'EPA', 'CDC'];
      const filtered = alerts.filter(alert => 
        foodAgencies.includes(alert.source)
      ).slice(0, 5);
      return filtered;
    }
    
    if (selectedAgency === 'ALL') {
      return alerts.slice(0, 5);
    }
    
    const filtered = alerts.filter(alert => {
      const sourceMatch = alert.source.toLowerCase() === selectedAgency.toLowerCase();
      console.log('Filter check:', { 
        alertSource: alert.source, 
        selectedAgency, 
        match: sourceMatch 
      });
      return sourceMatch;
    }).slice(0, 5);
    
    console.log('Filtered results:', { 
      originalCount: alerts.length, 
      filteredCount: filtered.length,
      selectedAgency 
    });
    
    return filtered;
  }, [alerts, selectedAgency]);

  const getAgencyColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('fda')) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (sourceLower.includes('usda')) return 'text-green-700 bg-green-50 border-green-200';
    if (sourceLower.includes('epa')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (sourceLower.includes('cdc')) return 'text-red-700 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement email signup
    console.log('Signup with email:', email);
  };

  const handleSearchClick = (alert: any) => {
    console.log('Landing page search button clicked for:', alert.title);
    searchForAlert(alert.title, alert.source);
  };

  const handleExternalClick = (alert: any) => {
    console.log('Landing page external link clicked for:', alert.title);
    if (alert.external_url) {
      // Decode HTML entities in the URL
      const decodedUrl = alert.external_url
        ?.replace(/&amp;/g, '&')
        ?.replace(/&lt;/g, '<')
        ?.replace(/&gt;/g, '>')
        ?.replace(/&quot;/g, '"')
        ?.replace(/&#39;/g, "'");
      
      if (decodedUrl) {
        window.open(decodedUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };


  return (
    <MobileLayout showNavigation={false}>
      <Helmet>
        <title>RegIQ - Real-Time FDA, USDA & EPA Regulatory Alerts | Compliance Monitoring</title>
        <meta name="description" content="Get instant FDA recalls, USDA food safety alerts, and EPA enforcement actions. AI-powered regulatory monitoring for food, pharma, and ag compliance teams." />
        <meta name="keywords" content="FDA alerts, USDA recalls, EPA enforcement, regulatory compliance, food safety alerts, pharma recalls, real-time monitoring" />
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
                "@type": "Offer",
                "price": "0",
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
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl">RegIQ</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#food-alerts" className="text-muted-foreground hover:text-foreground transition-colors">Food Safety Alerts</a>
            <a href="#ai-search" className="text-muted-foreground hover:text-foreground transition-colors">Food Regulation Search</a>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
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
          <div className="md:hidden">
            {/* Mobile navigation is handled by MobileLayout */}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto text-center max-w-6xl">
          {/* Live Status Indicator */}
          <div className="mb-4 md:mb-6">
            <Badge variant="secondary" className="mb-4 text-xs md:text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live • Updated {alerts.length > 0 ? formatDate(alerts[0]?.published_date) : '2 hours ago'}
            </Badge>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
            Food Industry<br />
            <span className="text-primary">Regulatory Intelligence</span>
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto px-4">
            Real-time FDA, USDA, EPA alerts with AI summaries - built for food safety teams.<br className="hidden sm:block" />
            <span className="font-medium text-foreground">Stop missing critical food safety updates. Get personalized alerts that matter to your business.</span>
          </p>
          
          <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-6 md:mb-8 px-4">
            <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
              <Link to={user ? getDashboardUrl() : "/auth"}>
                Get Free Food Safety Alerts <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base">
                <a href="#food-alerts">See Live Alerts</a>
              </Button>
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
                <Link to="/pricing">
                  View Pro Plans <Zap className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-6 md:py-8 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
              <h3 className="font-semibold text-base md:text-lg mb-2">Cross-agency food monitoring</h3>
              <p className="text-sm md:text-base text-muted-foreground">FDA, USDA, EPA, CDC in one place</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">Plain English summaries</h3>
              <p className="text-sm md:text-base text-muted-foreground">No regulatory jargon, food-focused</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">Free for food professionals</h3>
              <p className="text-sm md:text-base text-muted-foreground">Mobile-optimized for plant floor access</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Intelligence Section - Enhanced */}
      <section id="ai-search" className="py-8 md:py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">🚀 NEW: Enhanced AI Intelligence with Live Sources</h2>
            <p className="text-muted-foreground text-base md:text-lg">AI-powered regulatory analysis with real-time source verification</p>
          </div>
          
          <Card className="p-4 md:p-6 border-2 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <h3 className="text-base md:text-lg font-semibold">🤖 AI Intelligence powered by Perplexity + OpenAI</h3>
              <Badge variant="secondary" className="text-xs">LIVE SOURCES</Badge>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <strong className="text-green-800">✅ What's New:</strong>
                  <ul className="text-green-700 space-y-1 mt-1">
                    <li>• AI analyzes alerts with regulatory context</li>
                    <li>• Real-time source verification & citations</li>
                    <li>• Enhanced summaries with urgency scoring</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">🎯 AI Enhancement:</strong>
                  <ul className="text-green-700 space-y-1 mt-1">
                    <li>• Powered by Perplexity AI</li>
                    <li>• Official source verification</li>
                    <li>• Context-aware regulatory insights</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="🔥 Try: 'Most recent FDA food recalls?' or 'Latest USDA meat safety alerts'"
                className="pl-4 pr-12 py-4 md:py-6 text-base md:text-lg"
                onClick={() => setIsChatOpen(true)}
                readOnly
              />
              <Button 
                size="icon" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setIsChatOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {[
                "Most recent recalls",
                "Latest safety alerts", 
                "Current outbreaks",
                "This week's violations",
                "New regulations",
                "Emergency notices"
              ].map((category) => (
                <Button 
                  key={category} 
                  variant="outline" 
                  size="sm" 
                  className="text-xs md:text-sm h-8 md:h-9"
                  onClick={() => setIsChatOpen(true)}
                >
                  {category}
                </Button>
              ))}
            </div>
            
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              ✨ AI-powered regulatory intelligence with live source verification and enhanced context
            </p>
          </Card>
        </div>
      </section>

      {/* Live Dashboard Preview */}
      <section id="food-alerts" className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 mb-6 md:mb-8">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Live Food Safety Alerts</h2>
              <p className="text-muted-foreground text-sm md:text-base">Real-time updates from FDA, USDA, EPA, and CDC</p>
            </div>
            
            {/* Enhanced Agency Filter */}
            <div className="flex flex-col gap-4 w-full">
              <DataRefreshButton />
              
              <div className="bg-background border rounded-lg p-3 md:p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Food Agency Focus:</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAgency('ALL')}
                      className="text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
                    >
                      Show All Agencies
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { 
                        name: 'FDA', 
                        color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100', 
                        icon: '🛡️',
                        fullName: 'FDA Food Safety',
                        priority: 1
                      },
                      { 
                        name: 'USDA', 
                        color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100', 
                        icon: '🌾',
                        fullName: 'USDA Agriculture',
                        priority: 2
                      },
                      { 
                        name: 'EPA', 
                        color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100', 
                        icon: '🌿',
                        fullName: 'EPA Environment',
                        priority: 3
                      },
                      { 
                        name: 'CDC', 
                        color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', 
                        icon: '⚕️',
                        fullName: 'CDC Public Health',
                        priority: 4
                      }
                    ].map(agency => {
                      const count = alerts.filter(alert => alert.source === agency.name).length;
                      const isSelected = selectedAgency.toUpperCase() === agency.name;
                      return (
                        <Button
                          key={agency.name}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedAgency(agency.name)}
                          className={cn(
                            "justify-start gap-2 h-10 md:h-12 text-xs md:text-sm flex-col p-2",
                            !isSelected && agency.color,
                            isSelected && "bg-primary text-primary-foreground"
                          )}
                        >
                          <div className="flex items-center gap-1 w-full">
                            <span className="text-base">{agency.icon}</span>
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="font-medium truncate">{agency.name}</span>
                              <span className="text-xs opacity-70">{count} alerts</span>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant={selectedAgency === 'ALL' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedAgency('ALL')}
                    className="mt-2 w-full sm:w-auto text-xs md:text-sm"
                  >
                    All Agencies ({alerts.length})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        
        {/* Admin Tools - Temporary */}
        {isAdmin && (
          <div className="mb-8 space-y-4">
            <TestDataRunner />
            <AlertSourceFinder />
          </div>
        )}

        {/* Search Demo */}
        {featuredAlert && (
          <div className="mb-8 space-y-4">
            <AlertSourceSearchDemo alert={featuredAlert} />
            <KeywordExtractionDemo />
          </div>
        )}

        {/* Featured Alert */}
          {featuredAlert && (
            <Card className="mb-8 border-2 border-red-200 bg-red-50/50">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={getAgencyColor(featuredAlert.source)}>
                        {featuredAlert.source}
                      </Badge>
                      <Badge className={getUrgencyColor(featuredAlert.urgency)}>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {featuredAlert.urgency} Priority
                      </Badge>
                      {featuredAlert.urgency?.toLowerCase() === 'high' || featuredAlert.urgency?.toLowerCase() === 'critical' ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          🍎 FOOD SAFETY
                        </Badge>
                      ) : null}
                      <span className="text-sm text-muted-foreground">
                        {formatDate(featuredAlert.published_date)}
                      </span>
                    </div>
                    <CardTitle className="text-xl leading-tight mb-3">
                      {featuredAlert.title}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {featuredAlert.summary}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {isValidSourceUrl(featuredAlert.external_url) ? (
                    <>
                      <MobileButton 
                        variant="outline" 
                        onClick={() => handleExternalClick(featuredAlert)}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Read Full Alert
                      </MobileButton>
                      <MobileButton 
                        variant="secondary" 
                        className="flex items-center gap-2"
                        disabled
                      >
                        <Bot className="w-4 h-4" />
                        AI Enhanced Sources Available
                      </MobileButton>
                    </>
                  ) : (
                    <>
                    <MobileButton 
                      variant="secondary" 
                      className="flex items-center gap-2"
                      disabled
                    >
                      <Bot className="w-4 h-4" />
                      AI Enhanced Sources Available
                    </MobileButton>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alert Feed */}
          <div className="grid gap-4">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardHeader>
                </Card>
              ))
            ) : displayAlerts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    No alerts available. Debug: total alerts = {alerts.length}, filtered = {displayAlerts.length}
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayAlerts.map((alert) => (
                <PerplexityAlertCard
                  key={alert.id}
                  alert={alert}
                  onDismissAlert={() => {}} // No dismiss functionality on landing page
                  onSaveAlert={(alert) => toggleSaveAlert(alert.id)}
                  savedAlerts={[]} // Saved alerts not applicable on landing page
                  showEnhancedDetails={true}
                />
              ))
            )}
          </div>

          {!user && (
            <div className="text-center mt-8">
              <Button asChild>
                <Link to="/auth">Get Personalized Alerts - Free</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Food Industry Trust Section */}
      <section className="py-8 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Official Government Data • No Delays, No Filtering</h3>
            <p className="text-muted-foreground mb-6">Direct agency feeds monitored continuously for food safety teams</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-blue-500">
                <div className="text-2xl mb-2">🛡️</div>
                <div className="font-medium text-blue-700">FDA</div>
                <div className="text-sm text-muted-foreground">Food Safety Authority</div>
              </div>
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-green-500">
                <div className="text-2xl mb-2">🌾</div>
                <div className="font-medium text-green-700">USDA</div>
                <div className="text-sm text-muted-foreground">Agriculture & Meat Safety</div>
              </div>
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-emerald-500">
                <div className="text-2xl mb-2">🌿</div>
                <div className="font-medium text-emerald-700">EPA</div>
                <div className="text-sm text-muted-foreground">Environmental Protection</div>
              </div>
              <div className="bg-background border rounded-lg p-4 border-l-4 border-l-red-500">
                <div className="text-2xl mb-2">⚕️</div>
                <div className="font-medium text-red-700">CDC</div>
                <div className="text-sm text-muted-foreground">Public Health Alerts</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span>✅ Real-time Government Data</span>
            <span>✅ Built by Food Industry Professionals</span>
            <span>✅ Always Free for Food Safety Teams</span>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Monitoring {alerts.length.toLocaleString()}+ food safety alerts this month
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Built for Food Industry Professionals</h2>
            <p className="text-muted-foreground text-base md:text-lg">Three simple steps to smarter food safety monitoring</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Search className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3">1. We Monitor Food Agencies</h3>
              <p className="text-sm md:text-base text-muted-foreground">Real-time tracking of FDA, USDA, EPA, CDC feeds for food safety alerts and regulatory changes</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Brain className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3">2. AI Enhances with Live Sources</h3>
              <p className="text-sm md:text-base text-muted-foreground">Perplexity AI analyzes alerts, verifies sources, and provides regulatory context with official citations</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Bell className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3">3. You Stay Compliant</h3>
              <p className="text-sm md:text-base text-muted-foreground">Get food safety alerts that matter to your business, when they matter - before they impact operations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Email Signup Section */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-4 md:p-6 lg:p-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Get Critical Food Safety Alerts + AI Search</h2>
            <p className="text-muted-foreground text-base md:text-lg mb-6">
              Free regulatory intelligence for food industry professionals
            </p>
            
            <form onSubmit={handleEmailSignup} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto mb-4">
              <Input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" className="w-full sm:w-auto whitespace-nowrap">Get Free Food Safety Alerts</Button>
            </form>
            
            <div className="text-xs md:text-sm text-muted-foreground mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-w-2xl mx-auto">
                <span>✅ AI-powered regulatory intelligence (Perplexity)</span>
                <span>✅ FDA/USDA recalls & safety alerts</span>
                <span>✅ Plain English summaries, no jargon</span>
                <span>✅ Mobile notifications for plant floor</span>
              </div>
              <p className="mt-2">Always free for food industry professionals</p>
            </div>
            
            <Button variant="outline" asChild>
              <Link to="/search">Browse all food safety alerts →</Link>
            </Button>
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
        <div className="container mx-auto text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Free regulatory intelligence for food manufacturers, suppliers & safety teams
          </p>
        </div>
      </footer>

      {/* Chatbot */}
      <ConversationalChatbot 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />

      {/* Cookie Consent */}
      <CookieConsent />
    </MobileLayout>
  );
};

export default Landing;

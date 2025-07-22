import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Shield, Zap, Bell, Brain, Clock, TrendingUp, ExternalLink, Filter, Search, AlertCircle, Globe } from "lucide-react";
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
import { AlertSourceSearchDemo } from "@/components/AlertSourceSearchDemo";
import { KeywordExtractionDemo } from "@/components/KeywordExtractionDemo";
import { searchForAlert, isValidSourceUrl } from "@/lib/alert-search";
import { Helmet } from 'react-helmet-async';
import { cn } from "@/lib/utils";

const Landing = () => {
  console.log('Landing component is loading - updated version!');
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
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

  // Get filtered alerts for display
  const displayAlerts = useMemo(() => {
    console.log('Filtering alerts:', { 
      totalAlerts: alerts.length, 
      selectedAgency, 
      sampleSources: alerts.slice(0, 3).map(a => a.source) 
    });
    
    if (!selectedAgency) {
      return alerts.slice(0, 10);
    }
    
    const filtered = alerts.filter(alert => {
      const sourceMatch = alert.source.toLowerCase() === selectedAgency.toLowerCase();
      console.log('Filter check:', { 
        alertSource: alert.source, 
        selectedAgency, 
        match: sourceMatch 
      });
      return sourceMatch;
    }).slice(0, 10);
    
    console.log('Filtered results:', { 
      originalCount: alerts.length, 
      filteredCount: filtered.length,
      selectedAgency 
    });
    
    return filtered;
  }, [alerts, selectedAgency]);

  const getAgencyColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('fda')) return 'text-red-600 bg-red-50 border-red-200';
    if (sourceLower.includes('usda')) return 'text-green-600 bg-green-50 border-green-200';
    if (sourceLower.includes('epa')) return 'text-blue-600 bg-blue-50 border-blue-200';
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
            <Link to="/alerts" className="text-muted-foreground hover:text-foreground transition-colors">Browse Alerts</Link>
            <Link to="/food-safety" className="text-muted-foreground hover:text-foreground transition-colors">Food Safety</Link>
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
      <section className="py-12 px-4">
        <div className="container mx-auto text-center max-w-6xl">
          {/* Live Status Indicator */}
          <div className="mb-6">
            <Badge variant="secondary" className="mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live • Updated {alerts.length > 0 ? formatDate(alerts[0]?.published_date) : '2 hours ago'}
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Regulatory News,<br />
            <span className="text-primary">Minus the Noise</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            AI-powered regulatory alerts for food, ag, and pharma compliance teams. See what's happening right now.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button size="lg" className="px-8 py-3" asChild>
              <Link to={user ? getDashboardUrl() : "/auth"}>
                Get Personalized Alerts <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-3">
              <a href="#how-it-works">How it Works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-8 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Real-time Monitoring</h3>
              <p className="text-muted-foreground">Aggregate FDA, USDA, EPA feeds automatically</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">AI Summaries</h3>
              <p className="text-muted-foreground">Cut through regulatory jargon with plain English</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Filtering</h3>
              <p className="text-muted-foreground">Get only alerts relevant to your industry</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Dashboard Preview */}
      <section id="alerts" className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Live Regulatory Alerts</h2>
              <p className="text-muted-foreground">Real-time updates from trusted government sources</p>
            </div>
            <div className="flex items-center gap-4">
              <DataRefreshButton />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter:</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedAgency === '' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAgency('')}
                    className="text-xs"
                  >
                    All ({alerts.length})
                  </Button>
                  {['FDA', 'USDA', 'EPA', 'CDC'].map(agency => {
                    const count = alerts.filter(alert => alert.source === agency).length;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={agency}
                        variant={selectedAgency.toUpperCase() === agency ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedAgency(agency)}
                        className="text-xs"
                      >
                        {agency} ({count})
                      </Button>
                    );
                  })}
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
            <Card className="mb-8 border-2 border-orange-200 bg-orange-50/50">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getAgencyColor(featuredAlert.source)}>
                        {featuredAlert.source}
                      </Badge>
                      <Badge className={getUrgencyColor(featuredAlert.urgency)}>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {featuredAlert.urgency} Priority
                      </Badge>
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
                <div className="flex items-center gap-2">
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
                        variant="ghost" 
                        onClick={() => handleSearchClick(featuredAlert)}
                        className="flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        Search Web
                      </MobileButton>
                    </>
                  ) : (
                    <MobileButton 
                      variant="outline" 
                      onClick={() => handleSearchClick(featuredAlert)}
                      className="flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Find Source
                    </MobileButton>
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
                <Card key={alert.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className={getAgencyColor(alert.source)}>
                            {alert.source}
                          </Badge>
                          <Badge variant="outline" className={getUrgencyColor(alert.urgency)}>
                            {alert.urgency}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(alert.published_date)}
                          </span>
                        </div>
                        <CardTitle className="text-lg leading-tight mb-2">
                          {alert.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {alert.summary}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                   <CardContent className="pt-0">
                     <div className="flex items-center gap-2">
                       {isValidSourceUrl(alert.external_url) ? (
                         <>
                           <MobileButton 
                             variant="outline" 
                             onClick={() => handleExternalClick(alert)}
                             className="flex items-center gap-2"
                           >
                             <ExternalLink className="w-3 h-3" />
                             Read Full Alert
                           </MobileButton>
                           <MobileButton 
                             variant="ghost" 
                             onClick={() => handleSearchClick(alert)}
                             className="flex items-center gap-2"
                           >
                             <Globe className="w-3 h-3" />
                             Search Web
                           </MobileButton>
                         </>
                       ) : (
                         <MobileButton 
                           variant="outline" 
                           onClick={() => handleSearchClick(alert)}
                           className="flex items-center gap-2"
                         >
                           <Search className="w-3 h-3" />
                           Find Source
                         </MobileButton>
                       )}
                     </div>
                   </CardContent>
                </Card>
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

      {/* Trust Section */}
      <section className="py-8 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6">
            <p className="text-muted-foreground mb-4">Monitoring alerts from trusted sources</p>
            <div className="flex justify-center items-center gap-8 flex-wrap">
              <Badge variant="outline" className="text-red-600 border-red-200 px-4 py-2">FDA</Badge>
              <Badge variant="outline" className="text-green-600 border-green-200 px-4 py-2">USDA</Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-200 px-4 py-2">EPA</Badge>
              <Badge variant="outline" className="px-4 py-2">CDC</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Tracking {alerts.length.toLocaleString()}+ alerts this month
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to smarter regulatory monitoring</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. We Monitor</h3>
              <p className="text-muted-foreground">Real-time tracking of regulatory feeds from FDA, USDA, EPA, and more</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. AI Analyzes</h3>
              <p className="text-muted-foreground">Smart summaries and urgency scoring to cut through the noise</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. You Decide</h3>
              <p className="text-muted-foreground">Get alerts that matter to your business, when they matter</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-8">
            <h2 className="text-3xl font-bold mb-4">Ready to simplify regulatory monitoring?</h2>
            <p className="text-muted-foreground text-lg mb-6">
              Join compliance teams getting smarter regulatory intelligence
            </p>
            
            <form onSubmit={handleEmailSignup} className="flex gap-2 max-w-md mx-auto mb-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit">Get Free Alerts</Button>
            </form>
            
            <p className="text-xs text-muted-foreground mb-4">
              No spam, unsubscribe anytime
            </p>
            
            <Button variant="outline" asChild>
              <Link to="/search">Browse all alerts →</Link>
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
              Built for compliance professionals who value their time
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
    </MobileLayout>
  );
};

export default Landing;

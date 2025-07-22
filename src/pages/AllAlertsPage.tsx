import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowLeft, ExternalLink, AlertTriangle, Calendar, Building2, Filter } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const AllAlertsPage = () => {
  const agencies = [
    { 
      name: 'FDA', 
      fullName: 'Food and Drug Administration',
      description: 'Food recalls, drug safety alerts, medical device warnings',
      href: '/alerts/fda',
      color: 'text-red-600 bg-red-50 border-red-200'
    },
    { 
      name: 'USDA', 
      fullName: 'United States Department of Agriculture',
      description: 'Meat, poultry recalls, food safety alerts',
      href: '/alerts/usda',
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    { 
      name: 'EPA', 
      fullName: 'Environmental Protection Agency',
      description: 'Environmental enforcement, chemical safety',
      href: '/alerts/epa',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    { 
      name: 'CDC', 
      fullName: 'Centers for Disease Control',
      description: 'Health alerts, outbreak investigations',
      href: '/alerts/cdc',
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    }
  ];

  const industries = [
    {
      name: 'Food Safety',
      description: 'FDA & USDA food recalls, contamination alerts',
      href: '/food-safety',
      icon: '🍎',
      stats: 'Most monitored industry'
    },
    {
      name: 'Pharmaceutical',
      description: 'Drug recalls, medical device alerts, FDA warnings',
      href: '/pharma-compliance',
      icon: '💊',
      stats: 'Critical compliance area'
    },
    {
      name: 'Agriculture',
      description: 'Pesticide alerts, crop safety, USDA updates',
      href: '/agricultural-alerts',
      icon: '🌾',
      stats: 'Environmental focus'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <Helmet>
        <title>All Regulatory Alerts | FDA USDA EPA CDC Real-Time Monitoring | RegIQ</title>
        <meta name="description" content="Comprehensive regulatory alert monitoring across FDA, USDA, EPA, and CDC. Real-time alerts, recalls, and enforcement actions for compliance professionals." />
        <meta name="keywords" content="regulatory alerts, FDA alerts, USDA recalls, EPA enforcement, CDC health alerts, compliance monitoring, real-time alerts" />
        <link rel="canonical" href="https://regiq.com/alerts" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Regulatory Alerts Directory",
            "description": "Comprehensive directory of FDA, USDA, EPA, and CDC regulatory alerts",
            "url": "https://regiq.com/alerts",
            "mainEntity": {
              "@type": "ItemList",
              "itemListElement": agencies.map((agency, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "GovernmentService",
                  "name": `${agency.fullName} Alerts`,
                  "description": agency.description,
                  "url": `https://regiq.com${agency.href}`
                }
              }))
            }
          })}
        </script>
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">RegIQ</span>
            </div>
          </div>
          <nav className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Regulatory Alerts Directory</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive real-time monitoring of FDA, USDA, EPA, and CDC alerts. 
            Stay compliant with AI-powered regulatory intelligence across all major agencies.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary mb-2">4</div>
              <p className="text-sm text-muted-foreground">Major Agencies</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Real-time Monitoring</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">AI</div>
              <p className="text-sm text-muted-foreground">Powered Analysis</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600 mb-2">∞</div>
              <p className="text-sm text-muted-foreground">Alert History</p>
            </CardContent>
          </Card>
        </div>

        {/* Agency Directory */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Browse by Agency</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {agencies.map((agency) => (
              <Card key={agency.name} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to={agency.href} className="block">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Badge className={`text-lg px-3 py-1 ${agency.color}`}>
                        {agency.name}
                      </Badge>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{agency.fullName}</CardTitle>
                        <CardDescription>{agency.description}</CardDescription>
                      </div>
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        {/* Industry Directory */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Browse by Industry</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {industries.map((industry) => (
              <Card key={industry.name} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to={industry.href} className="block">
                  <CardHeader className="text-center">
                    <div className="text-4xl mb-2">{industry.icon}</div>
                    <CardTitle className="text-lg">{industry.name}</CardTitle>
                    <CardDescription className="mb-2">{industry.description}</CardDescription>
                    <Badge variant="outline" className="text-xs">
                      {industry.stats}
                    </Badge>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                <CardTitle>Real-time Alerts</CardTitle>
                <CardDescription>
                  Instant notifications for critical regulatory updates across all agencies
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Building2 className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle>AI Summaries</CardTitle>
                <CardDescription>
                  GPT-powered analysis turns complex regulatory language into clear insights
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Filter className="h-8 w-8 text-green-500 mb-2" />
                <CardTitle>Smart Filtering</CardTitle>
                <CardDescription>
                  Customizable filters by agency, industry, urgency level, and keywords
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="text-center py-12">
            <h3 className="text-2xl font-semibold mb-4">
              Start Monitoring Regulatory Alerts Today
            </h3>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join compliance professionals who rely on RegIQ for real-time regulatory intelligence. 
              Never miss critical alerts that impact your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/dashboard">View Live Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AllAlertsPage;
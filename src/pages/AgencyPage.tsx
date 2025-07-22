import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, ArrowLeft, ExternalLink, Search, Globe, AlertCircle, Calendar } from 'lucide-react';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { searchForAlert, isValidSourceUrl } from '@/lib/alert-search';
import { formatDistanceToNow } from 'date-fns';
import { Helmet } from 'react-helmet-async';

const agencyData = {
  fda: {
    name: 'FDA',
    fullName: 'Food and Drug Administration',
    description: 'FDA food recalls, drug safety alerts, medical device warnings, and enforcement actions',
    keywords: 'FDA alerts, FDA recalls, food safety, drug recalls, medical device alerts, FDA enforcement',
    color: 'text-red-600 bg-red-50 border-red-200',
    about: 'The FDA regulates food safety, pharmaceuticals, medical devices, tobacco, and cosmetics. Monitor critical FDA alerts including food recalls, drug safety warnings, and enforcement actions.',
    alertTypes: ['Food Recalls', 'Drug Safety Alerts', 'Medical Device Warnings', 'Import Alerts', 'Warning Letters']
  },
  usda: {
    name: 'USDA',
    fullName: 'United States Department of Agriculture',
    description: 'USDA food safety recalls, FSIS meat alerts, and agricultural compliance updates',
    keywords: 'USDA alerts, FSIS recalls, meat recalls, food safety, agricultural alerts, poultry recalls',
    color: 'text-green-600 bg-green-50 border-green-200',
    about: 'USDA and FSIS regulate meat, poultry, and egg products. Track critical food safety recalls and agricultural compliance updates.',
    alertTypes: ['Meat & Poultry Recalls', 'Public Health Alerts', 'FSIS Enforcement', 'Agricultural Updates', 'Import Restrictions']
  },
  epa: {
    name: 'EPA',
    fullName: 'Environmental Protection Agency',
    description: 'EPA enforcement actions, pesticide alerts, and environmental compliance updates',
    keywords: 'EPA alerts, environmental enforcement, pesticide alerts, air quality, water safety, chemical alerts',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    about: 'EPA regulates environmental protection, chemical safety, and pollution control. Monitor enforcement actions and environmental compliance requirements.',
    alertTypes: ['Enforcement Actions', 'Pesticide Alerts', 'Chemical Safety', 'Air Quality Updates', 'Water Safety Notices']
  },
  cdc: {
    name: 'CDC',
    fullName: 'Centers for Disease Control and Prevention',
    description: 'CDC health alerts, outbreak investigations, and public health warnings',
    keywords: 'CDC alerts, health warnings, outbreak alerts, disease surveillance, public health',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    about: 'CDC monitors disease outbreaks, health emergencies, and public health threats. Stay informed about critical health alerts and outbreak investigations.',
    alertTypes: ['Health Alerts', 'Outbreak Investigations', 'Travel Health Notices', 'Emergency Preparedness', 'Disease Surveillance']
  }
};

const AgencyPage = () => {
  const { agency } = useParams<{ agency: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const { alerts, loading } = useSimpleAlerts();

  const agencyInfo = agency ? agencyData[agency.toLowerCase() as keyof typeof agencyData] : null;

  const agencyAlerts = useMemo(() => {
    if (!agencyInfo) return [];
    
    let filtered = alerts.filter(alert => 
      alert.source.toLowerCase().includes(agencyInfo.name.toLowerCase()) ||
      (agencyInfo.name === 'USDA' && alert.source.toLowerCase().includes('fsis'))
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(query) ||
        alert.summary.toLowerCase().includes(query)
      );
    }

    return filtered.slice(0, 20);
  }, [alerts, agencyInfo, searchQuery]);

  if (!agencyInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agency Not Found</h1>
          <Link to="/alerts">
            <Button>View All Alerts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <Helmet>
        <title>{agencyInfo.fullName} Alerts & Recalls - Real-Time Monitoring | RegIQ</title>
        <meta name="description" content={`${agencyInfo.description}. Real-time monitoring of ${agencyInfo.fullName} alerts for compliance professionals.`} />
        <meta name="keywords" content={agencyInfo.keywords} />
        <link rel="canonical" href={`https://regiq.com/alerts/${agency}`} />
        
        {/* Breadcrumb Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "RegIQ",
                "item": "https://regiq.com"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Alerts",
                "item": "https://regiq.com/alerts"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": agencyInfo.fullName,
                "item": `https://regiq.com/alerts/${agency}`
              }
            ]
          })}
        </script>

        {/* Agency-specific structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "GovernmentService",
            "name": `${agencyInfo.fullName} Alert Monitoring`,
            "description": agencyInfo.description,
            "provider": {
              "@type": "Organization",
              "name": "RegIQ"
            },
            "serviceType": "Regulatory Alert Monitoring",
            "areaServed": "United States",
            "audience": {
              "@type": "Audience",
              "audienceType": "Compliance Professionals"
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
              <Link to="/alerts">All Alerts</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <nav aria-label="breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">RegIQ</Link></li>
            <li>/</li>
            <li><Link to="/alerts" className="hover:text-foreground">Alerts</Link></li>
            <li>/</li>
            <li className="text-foreground font-medium">{agencyInfo.fullName}</li>
          </ol>
        </nav>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge className={`text-lg px-4 py-2 ${agencyInfo.color}`}>
              {agencyInfo.name}
            </Badge>
            <h1 className="text-3xl font-bold">{agencyInfo.fullName} Alerts</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            {agencyInfo.about}
          </p>
          
          {/* Alert Types */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Alert Types We Monitor:</h2>
            <div className="flex flex-wrap gap-2">
              {agencyInfo.alertTypes.map((type, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${agencyInfo.name} alerts...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total {agencyInfo.name} Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{agencyAlerts.length}</div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Filtered results' : 'Real-time monitoring'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {agencyAlerts.filter(a => a.urgency?.toLowerCase() === 'high').length}
              </div>
              <p className="text-sm text-muted-foreground">Critical alerts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {agencyAlerts.filter(a => {
                  const alertDate = new Date(a.published_date);
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  return alertDate >= yesterday;
                }).length}
              </div>
              <p className="text-sm text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Feed */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Latest {agencyInfo.name} Alerts
            </h2>
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Updates
            </Badge>
          </div>

          <div className="grid gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardHeader>
                </Card>
              ))
            ) : agencyAlerts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? `No ${agencyInfo.name} alerts match your search.` 
                      : `No ${agencyInfo.name} alerts available at the moment.`
                    }
                  </p>
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery('')} className="mt-4">
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              agencyAlerts.map((alert) => (
                <Card key={alert.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className={agencyInfo.color}>
                            {alert.source}
                          </Badge>
                          <Badge variant="outline" className={getUrgencyColor(alert.urgency)}>
                            {alert.urgency === 'High' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {alert.urgency}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(alert.published_date)}
                          </div>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      {isValidSourceUrl(alert.external_url) ? (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={alert.external_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Full Alert
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => searchForAlert(alert.title, alert.source)}
                            className="flex items-center gap-2"
                          >
                            <Globe className="w-3 h-3" />
                            Search Web
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => searchForAlert(alert.title, alert.source)}
                          className="flex items-center gap-2"
                        >
                          <Search className="w-3 h-3" />
                          Find Source
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* CTA Section */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="text-center py-8">
              <h3 className="text-xl font-semibold mb-2">
                Stay Ahead of {agencyInfo.name} Compliance
              </h3>
              <p className="text-muted-foreground mb-4">
                Get real-time alerts, AI summaries, and instant notifications for all {agencyInfo.fullName} updates.
              </p>
              <Button asChild size="lg">
                <Link to="/auth">Start Free Monitoring</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgencyPage;
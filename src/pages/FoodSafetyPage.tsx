import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, ArrowLeft, ExternalLink, Search, Globe, AlertCircle, Calendar, Utensils } from 'lucide-react';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { searchForAlert, isValidSourceUrl } from '@/lib/alert-search';
import { formatDistanceToNow } from 'date-fns';
import { Helmet } from 'react-helmet-async';

const FoodSafetyPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { alerts, loading } = useSimpleAlerts();

  const foodSafetyAlerts = useMemo(() => {
    let filtered = alerts.filter(alert => {
      const content = (alert.title + ' ' + alert.summary).toLowerCase();
      return content.includes('food') || 
             content.includes('recall') || 
             content.includes('contamination') ||
             content.includes('salmonella') ||
             content.includes('listeria') ||
             content.includes('e. coli') ||
             alert.source.toLowerCase().includes('fda') ||
             alert.source.toLowerCase().includes('usda') ||
             alert.source.toLowerCase().includes('fsis');
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(query) ||
        alert.summary.toLowerCase().includes(query)
      );
    }

    return filtered.slice(0, 20);
  }, [alerts, searchQuery]);

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

  const getAgencyColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('fda')) return 'text-red-600 bg-red-50 border-red-200';
    if (sourceLower.includes('usda') || sourceLower.includes('fsis')) return 'text-green-600 bg-green-50 border-green-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <Helmet>
        <title>Food Safety Alerts & Recalls Monitoring | FDA USDA Real-Time Updates</title>
        <meta name="description" content="Monitor FDA and USDA food safety alerts in real-time. Get instant notifications for recalls, contamination alerts, and safety warnings for food industry compliance." />
        <meta name="keywords" content="food safety alerts, FDA food recalls, USDA recalls, food contamination, salmonella alerts, listeria recalls, FSIS alerts, food industry compliance" />
        <link rel="canonical" href="https://regiq.com/food-safety" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Food Safety Alerts & Recalls Monitoring",
            "description": "Real-time FDA and USDA food safety alert monitoring",
            "url": "https://regiq.com/food-safety",
            "mainEntity": {
              "@type": "Service",
              "name": "Food Safety Alert Monitoring",
              "description": "Real-time monitoring of FDA and USDA food safety alerts and recalls",
              "provider": {
                "@type": "Organization",
                "name": "RegIQ"
              }
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

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Utensils className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold">Food Safety Alerts & Recalls</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Real-time monitoring of FDA and USDA food safety alerts, recalls, and contamination warnings. 
            Stay compliant with comprehensive coverage of food industry regulatory updates.
          </p>
          
          {/* Key Coverage Areas */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Coverage Areas:</h2>
            <div className="flex flex-wrap gap-2">
              {['Food Recalls', 'Contamination Alerts', 'Salmonella Warnings', 'Listeria Alerts', 'FSIS Notices', 'Import Alerts', 'Allergen Warnings'].map((type, index) => (
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
              placeholder="Search food safety alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{foodSafetyAlerts.length}</div>
              <p className="text-sm text-muted-foreground">Food safety related</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Critical Recalls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {foodSafetyAlerts.filter(a => a.urgency?.toLowerCase() === 'high').length}
              </div>
              <p className="text-sm text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">FDA Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {foodSafetyAlerts.filter(a => a.source.toLowerCase().includes('fda')).length}
              </div>
              <p className="text-sm text-muted-foreground">Food & Drug Admin</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">USDA/FSIS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {foodSafetyAlerts.filter(a => 
                  a.source.toLowerCase().includes('usda') || 
                  a.source.toLowerCase().includes('fsis')
                ).length}
              </div>
              <p className="text-sm text-muted-foreground">Meat & poultry</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Feed */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Latest Food Safety Alerts
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
            ) : foodSafetyAlerts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? 'No food safety alerts match your search.' 
                      : 'No food safety alerts available at the moment.'
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
              foodSafetyAlerts.map((alert) => (
                <Card key={alert.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className={getAgencyColor(alert.source)}>
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
          <Card className="bg-green-50 border-green-200">
            <CardContent className="text-center py-8">
              <h3 className="text-xl font-semibold mb-2">
                Never Miss a Critical Food Safety Alert
              </h3>
              <p className="text-muted-foreground mb-4">
                Get real-time notifications, AI summaries, and instant access to FDA and USDA food safety alerts.
              </p>
              <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                <Link to="/auth">Start Food Safety Monitoring</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FoodSafetyPage;
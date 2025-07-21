import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSimpleAlerts } from "@/hooks/useSimpleAlerts";
import { useSavedAlerts } from "@/hooks/useSavedAlerts";
import { RegIQFeed } from "@/components/RegIQFeed";
import { AlertTriangle, Clock, Shield, Filter, Search, TrendingUp, Users, CheckCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const LandingDashboard = () => {
  const [email, setEmail] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const { alerts, loading, error } = useSimpleAlerts();
  const { savedAlerts, toggleSaveAlert } = useSavedAlerts();

  // Get recent alerts for preview
  const featuredAlert = useMemo(() => {
    const highPriorityAlerts = alerts.filter(alert => 
      alert.urgency === 'high' || alert.urgency === 'critical'
    );
    return highPriorityAlerts[0] || alerts[0];
  }, [alerts]);

  const recentAlerts = useMemo(() => {
    return alerts.slice(0, 8);
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (!selectedAgency) return recentAlerts;
    return recentAlerts.filter(alert => 
      alert.source.toLowerCase().includes(selectedAgency.toLowerCase())
    );
  }, [recentAlerts, selectedAgency]);

  const handleSignup = () => {
    // TODO: Implement signup functionality
    console.log('Signup with email:', email);
  };

  const getAgencyBadgeColor = (source: string) => {
    if (source.includes('FDA')) return 'bg-red-100 text-red-800 border-red-200';
    if (source.includes('USDA')) return 'bg-green-100 text-green-800 border-green-200';
    if (source.includes('EPA')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live • Updated {loading ? 'now' : formatDate(alerts[0]?.published_date || new Date().toISOString())}
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-6">
            Regulatory News, Minus the Noise
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-powered regulatory alerts for food, ag, and pharma compliance teams. See what's happening right now.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={handleSignup} className="w-full sm:w-auto">
              Get Personalized Alerts
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              How it Works
            </Button>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-time Monitoring</h3>
            <p className="text-muted-foreground">Aggregate FDA, USDA, EPA feeds automatically</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Summaries</h3>
            <p className="text-muted-foreground">Cut through regulatory jargon with plain English</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Filter className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Filtering</h3>
            <p className="text-muted-foreground">Get only alerts relevant to your industry</p>
          </div>
        </div>

        {/* Featured Alert */}
        {featuredAlert && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Live Regulatory Alerts</h2>
              <Badge variant="outline" className="text-xs">
                Tracking {alerts.length} alerts this month
              </Badge>
            </div>
            
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getAgencyBadgeColor(featuredAlert.source)}>
                      {featuredAlert.source}
                    </Badge>
                    <Badge className={getUrgencyColor(featuredAlert.urgency)}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {featuredAlert.urgency} Priority
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(featuredAlert.published_date)}
                  </span>
                </div>
                <CardTitle className="text-lg leading-tight">
                  {featuredAlert.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {featuredAlert.summary || "AI summary processing..."}
                </p>
                {featuredAlert.external_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={featuredAlert.external_url} target="_blank" rel="noopener noreferrer">
                      Read Full Alert <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alert Feed with Filters */}
        <div className="mb-16">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search alerts..." 
                  className="pl-10"
                />
              </div>
            </div>
            <select 
              className="px-3 py-2 border rounded-md bg-background"
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
            >
              <option value="">All Agencies</option>
              <option value="FDA">FDA</option>
              <option value="USDA">USDA</option>
              <option value="EPA">EPA</option>
            </select>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getAgencyBadgeColor(alert.source)} variant="outline">
                        {alert.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(alert.published_date)}
                      </span>
                    </div>
                    <CardTitle className="text-sm leading-tight">
                      {alert.external_url ? (
                        <a 
                          href={alert.external_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors line-clamp-2"
                        >
                          {alert.title}
                        </a>
                      ) : (
                        <span className="line-clamp-2">{alert.title}</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {alert.summary || "AI summary processing..."}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge className={getUrgencyColor(alert.urgency)} variant="outline">
                        {alert.urgency}
                      </Badge>
                      <div className="flex gap-2">
                        {alert.external_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={alert.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Read Full Alert
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Social Proof */}
        <div className="text-center mb-16">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-2">
                  <span className="text-red-600 font-bold text-sm">FDA</span>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center mr-2">
                  <span className="text-green-600 font-bold text-sm">USDA</span>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">EPA</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Monitoring alerts from trusted sources</p>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-primary mb-1">{alerts.length}+</div>
              <p className="text-sm text-muted-foreground">Active alerts tracked</p>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-primary mb-1">24/7</div>
              <p className="text-sm text-muted-foreground">Real-time monitoring</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How RegIQ Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">We Monitor</h3>
              <p className="text-muted-foreground">Real-time tracking of regulatory feeds from FDA, USDA, EPA, and more</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Analyzes</h3>
              <p className="text-muted-foreground">Smart summaries and urgency scoring help you understand what matters</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">You Decide</h3>
              <p className="text-muted-foreground">Get alerts that matter to your business and compliance requirements</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mb-16">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Free Regulatory Alerts</CardTitle>
              <p className="text-muted-foreground">Join compliance teams getting smarter regulatory intel</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSignup}>
                  Get Alerts
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">No spam, unsubscribe anytime</p>
            </CardContent>
          </Card>
        </div>

        {/* Full Dashboard Access */}
        <Separator className="mb-8" />
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Explore All Alerts</h2>
          <p className="text-muted-foreground mb-6">
            Browse the complete RegIQ dashboard with advanced filtering and personalization
          </p>
        </div>

        {/* Embedded RegIQ Feed */}
        <RegIQFeed 
          onSaveAlert={toggleSaveAlert}
          savedAlerts={savedAlerts}
        />
      </div>
    </div>
  );
};

export default LandingDashboard;
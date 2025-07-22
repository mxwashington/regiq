import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Shield, Bell, TrendingUp, Settings, Search, Filter, ExternalLink, Globe, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';
import { useSavedAlerts } from '@/hooks/useSavedAlerts';
import { formatDistanceToNow } from 'date-fns';
import { searchForAlert, isValidSourceUrl } from '@/lib/alert-search';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { alerts, loading } = useSimpleAlerts();
  const { savedAlerts, toggleSaveAlert } = useSavedAlerts();
  
  // State for dashboard functionality (matching landing page)
  const [selectedAgency, setSelectedAgency] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  
  // User preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    urgencyThreshold: 'Medium',
    preferredSources: ['FDA', 'USDA', 'EPA'],
    industries: ['Food Safety']
  });

  // Get filtered alerts for display (same logic as landing page)
  const displayAlerts = useMemo(() => {
    let filtered = alerts;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(query) ||
        alert.summary.toLowerCase().includes(query) ||
        alert.source.toLowerCase().includes(query)
      );
    }
    
    // Apply agency filter
    if (selectedAgency) {
      filtered = filtered.filter(alert => {
        const sourceMatch = alert.source.toLowerCase() === selectedAgency.toLowerCase();
        return sourceMatch;
      });
    }
    
    return filtered.slice(0, 20); // Show more alerts in dashboard
  }, [alerts, selectedAgency, searchQuery]);

  // Agency filter counts (same as landing page)
  const agencyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'].forEach(agency => {
      counts[agency] = alerts.filter(alert => alert.source === agency).length;
    });
    return counts;
  }, [alerts]);

  const getAgencyColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('fda')) return 'text-red-600 bg-red-50 border-red-200';
    if (sourceLower.includes('usda')) return 'text-green-600 bg-green-50 border-green-200';
    if (sourceLower.includes('epa')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (sourceLower.includes('cdc')) return 'text-purple-600 bg-purple-50 border-purple-200';
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

  const handlePreferencesUpdate = () => {
    // TODO: Update user preferences in database
    setPreferencesOpen(false);
    console.log('Updated preferences:', preferences);
  };

  const clearFilters = () => {
    setSelectedAgency('');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">RegIQ</span>
            </div>
          </div>
          <nav className="flex items-center space-x-4">
            <Badge variant="secondary" className="hidden md:flex">
              Welcome, {user?.email}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link to="/search">Advanced Search</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Regulatory Dashboard</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest regulatory alerts and manage your saved items.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{savedAlerts.length}</div>
              <p className="text-xs text-muted-foreground">
                Total alerts saved
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
              <p className="text-xs text-muted-foreground">
                {searchQuery || selectedAgency ? `${displayAlerts.length} filtered` : 'All sources'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Preferences
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>User Preferences</DialogTitle>
                    <DialogDescription>
                      Customize your RegIQ experience and notification settings.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="email-notifications"
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => 
                          setPreferences(prev => ({ ...prev, emailNotifications: checked as boolean }))
                        }
                      />
                      <label htmlFor="email-notifications" className="text-sm">
                        Enable email notifications
                      </label>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Urgency Threshold</label>
                      <Select 
                        value={preferences.urgencyThreshold} 
                        onValueChange={(value) => 
                          setPreferences(prev => ({ ...prev, urgencyThreshold: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preferred Sources</label>
                      <div className="space-y-2">
                        {['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'].map(source => (
                          <div key={source} className="flex items-center space-x-2">
                            <Checkbox 
                              id={source}
                              checked={preferences.preferredSources.includes(source)}
                              onCheckedChange={(checked) => {
                                setPreferences(prev => ({
                                  ...prev,
                                  preferredSources: checked 
                                    ? [...prev.preferredSources, source]
                                    : prev.preferredSources.filter(s => s !== source)
                                }));
                              }}
                            />
                            <label htmlFor={source} className="text-sm">{source}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setPreferencesOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handlePreferencesUpdate}>
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section (same as landing page) */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts by title, content, or agency..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm font-medium">Filter:</label>
              <Button
                variant={selectedAgency === '' ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAgency('')}
                className="text-xs"
              >
                All ({alerts.length})
              </Button>
              {['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'].map(agency => {
                const count = agencyCounts[agency] || 0;
                if (count === 0) return null;
                return (
                  <Button
                    key={agency}
                    variant={selectedAgency === agency ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedAgency(agency)}
                    className="text-xs"
                  >
                    {agency} ({count})
                  </Button>
                );
              })}
              
              {(searchQuery || selectedAgency) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Feed Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {searchQuery || selectedAgency ? 'Filtered Alerts' : 'Latest Regulatory Updates'}
            </h2>
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Feed • {displayAlerts.length} alerts
            </Badge>
          </div>
          
          {/* Alert Feed (same style as landing page) */}
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
                    {searchQuery || selectedAgency 
                      ? 'No alerts match your current filters.' 
                      : 'No alerts available at the moment.'
                    }
                  </p>
                  {(searchQuery || selectedAgency) && (
                    <Button variant="outline" onClick={clearFilters} className="mt-4">
                      Clear Filters
                    </Button>
                  )}
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
                            {alert.urgency === 'High' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {alert.urgency}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(alert.published_date)}
                          </span>
                          {savedAlerts.some(saved => saved.id === alert.id) && (
                            <Badge variant="secondary" className="text-xs">
                              <Bell className="w-3 h-3 mr-1" />
                              Saved
                            </Badge>
                          )}
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
                              View Full Source
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
                      
                      <Button
                        variant={savedAlerts.some(saved => saved.id === alert.id) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleSaveAlert(alert.id)}
                        className="flex items-center gap-2"
                      >
                        <Bell className="w-3 h-3" />
                        {savedAlerts.some(saved => saved.id === alert.id) ? 'Saved' : 'Save Alert'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
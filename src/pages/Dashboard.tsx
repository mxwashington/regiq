import { useState, useEffect, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Filter, 
  Search, 
  Shield, 
  User,
  Calendar,
  TrendingUp,
  AlertTriangle,
  LogOut,
  CreditCard,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { EnhancedAlertsDashboard } from '@/components/EnhancedAlertsDashboard';
import { AdminNavigation } from '@/components/AdminNavigation';
import { FilterSidebar } from '@/components/FilterSidebar';
import { RegulatoryFeed } from '@/components/RegulatoryFeed';
import PerplexitySearch from '@/components/PerplexitySearch';
import { MobileNavigation } from '@/components/MobileNavigation';
import { useNavigationHelper } from '@/components/NavigationHelper';
import { SessionStatusIndicator } from '@/components/SessionStatusIndicator';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { searchCacheUtils } from '@/lib/search-cache';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, loading, signOut, isAdmin } = useAuth();
  const { navigateTo } = useNavigationHelper();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if forced to view as user via URL parameter
  const forceUserView = searchParams.get('viewAsUser') === 'true';
  
  // Add state for view toggle - admins can switch between admin and user view
  const [viewAsUser, setViewAsUser] = useState(forceUserView);

  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    newUpdates: 0,
    highPriority: 0,
    activeAlerts: 0,
    sources: 0
  });
  const [selectedFilters, setSelectedFilters] = useState({
    agencies: [] as string[],
    industries: [] as string[],
    urgency: [] as string[],
    signalTypes: [] as string[],
    dateRange: "7days" as string
  });

  // All hooks must be defined before any conditional returns
  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType as keyof typeof prev].includes(value)
        ? (prev[filterType as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[filterType as keyof typeof prev] as string[]), value]
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFilters({
      agencies: [],
      industries: [],
      urgency: [],
      signalTypes: [],
      dateRange: "7days"
    });
    setSearchQuery("");
  }, []);

  const getActiveFilterCount = useCallback(() => {
    return Object.values(selectedFilters).reduce((count, filters) => {
      if (Array.isArray(filters)) {
        return count + filters.length;
      }
      return filters !== "7days" ? count + 1 : count;
    }, 0);
  }, [selectedFilters]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await searchCacheUtils.cleanExpiredCache();
    } catch (error) {}
    finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Fetch dashboard stats from database
  const fetchStats = useCallback(async () => {
    try {
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('id, urgency, published_date, source, created_at');

      if (error) {
        console.error('Error fetching alerts:', error);
        return;
      }

      if (!alerts) return;

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate stats
      const newUpdates = alerts.filter(alert => 
        new Date(alert.published_date) >= yesterday
      ).length;

      const highPriority = alerts.filter(alert => 
        alert.urgency?.toLowerCase() === 'high'
      ).length;

      const activeAlerts = alerts.filter(alert => 
        new Date(alert.published_date) >= thisMonth
      ).length;

      const sources = new Set(alerts.map(alert => alert.source)).size;

      setStats({
        newUpdates,
        highPriority,
        activeAlerts,
        sources
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  }, []);

  useEffect(() => {
    searchCacheUtils.cleanExpiredCache();
    fetchStats(); // Fetch real stats on component mount
  }, [fetchStats]);

  useEffect(() => {
    if (!loading && !user) {
      navigateTo('/login');
    }
  }, [user, loading, navigateTo]);

  // Now conditional returns are safe since all hooks are defined above
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Show user view if admin has toggled "view as user" or if user is not admin
  const showUserView = !isAdmin || viewAsUser;

  // If admin and not viewing as user, show admin dashboard
  if (isAdmin && !viewAsUser) {
    return (
      <DashboardErrorBoundary>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-primary" />
                <span className="font-bold text-2xl">RegIQ</span>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Add View Toggle Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewAsUser(true)}
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>View as User</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user?.email?.split('@')[0] || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <MobileNavigation />
              </div>
            </div>
          </header>

          {/* Admin Navigation for admin users */}
          <AdminNavigation />

          {/* Main Dashboard Content */}
          <main className="flex-1">
            <div className="container mx-auto px-4 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Welcome back, {user?.email?.split('@')[0] || 'User'}!
                </h1>
                <p className="text-muted-foreground">
                  Monitor regulatory changes and stay compliant across all key agencies.
                </p>
              </div>
              
              <EnhancedAlertsDashboard />
            </div>
          </main>
        </div>
      </DashboardErrorBoundary>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-primary" />
                <span className="font-bold text-2xl">RegIQ</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <nav className="hidden md:flex items-center space-x-6">
                <Button variant="ghost" size="sm" className="font-medium">Dashboard</Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/search">Search</Link>
                </Button>
                <Button variant="ghost" size="sm">Alerts</Button>
                <Button variant="ghost" size="sm">Saved Items</Button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <MobileNavigation />
              <div className="hidden md:flex items-center space-x-4">
              {/* Add Admin Toggle Button if user is admin but viewing as user */}
              {isAdmin && viewAsUser && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewAsUser(false)}
                  className="flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin View</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <SessionStatusIndicator />
              <Badge variant="secondary">
                Free
              </Badge>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/subscription" className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscription
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          {/* Dashboard Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Regulatory Intelligence Dashboard</h1>
            <p className="text-muted-foreground">
              Stay informed with real-time regulatory updates from FDA, USDA, EPA, and more
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Updates</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newUpdates}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.highPriority}</div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeAlerts}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sources}</div>
                <p className="text-xs text-muted-foreground">Agencies monitored</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block lg:w-80">
              <FilterSidebar 
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onClearAll={clearAllFilters}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <Tabs defaultValue="feed" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="feed" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Feed
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    AI Search
                  </TabsTrigger>
                  <TabsTrigger value="trends" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Trends
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendar
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="feed" className="mt-6">
                  {/* Search and Mobile Filter */}
                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search regulatory updates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Mobile Filter Button */}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="lg:hidden">
                          <Filter className="h-4 w-4" />
                          {getActiveFilterCount() > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 text-xs">
                              {getActiveFilterCount()}
                            </Badge>
                          )}
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80">
                        <FilterSidebar 
                          selectedFilters={selectedFilters}
                          onFilterChange={handleFilterChange}
                          onClearAll={clearAllFilters}
                        />
                      </SheetContent>
                    </Sheet>
                  </div>

                  {/* Active Filters */}
                  {getActiveFilterCount() > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedFilters.agencies.map(agency => (
                        <Badge key={agency} variant="secondary">
                          {agency}
                          <button 
                            onClick={() => handleFilterChange('agencies', agency)}
                            className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      {selectedFilters.industries.map(industry => (
                        <Badge key={industry} variant="secondary">
                          {industry}
                          <button 
                            onClick={() => handleFilterChange('industries', industry)}
                            className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      {selectedFilters.urgency.map(urgency => (
                        <Badge key={urgency} variant="secondary">
                          {urgency}
                          <button 
                            onClick={() => handleFilterChange('urgency', urgency)}
                            className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                        Clear all
                      </Button>
                    </div>
                  )}

                  {/* Regulatory Feed */}
                  <RegulatoryFeed 
                    searchQuery={searchQuery}
                    selectedFilters={selectedFilters}
                  />
                </TabsContent>

                <TabsContent value="search" className="mt-6">
                  <div className="space-y-6">
                    <div className="text-center py-8 border border-dashed border-border rounded-lg">
                      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Advanced AI Search</h3>
                      <p className="text-muted-foreground mb-4">Access powerful regulatory intelligence search with advanced filters and analytics</p>
                      <Button onClick={() => navigateTo('/search')} className="w-auto">
                        <Search className="mr-2 h-4 w-4" />
                        Go to Advanced Search
                      </Button>
                    </div>
                    <PerplexitySearch />
                  </div>
                </TabsContent>

                <TabsContent value="trends" className="mt-6">
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Trends Analysis</h3>
                    <p className="text-muted-foreground">Regulatory trends and analytics coming soon...</p>
                  </div>
                </TabsContent>

                <TabsContent value="calendar" className="mt-6">
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Compliance Calendar</h3>
                    <p className="text-muted-foreground">Important deadlines and events coming soon...</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
};

export default Dashboard;
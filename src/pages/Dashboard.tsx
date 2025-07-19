import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Bell, 
  Filter, 
  Search, 
  Shield, 
  User,
  Calendar,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Info,
  Zap,
  LogOut,
  CreditCard
} from "lucide-react";
import { FilterSidebar } from "@/components/FilterSidebar";
import { RegulatoryFeed } from "@/components/RegulatoryFeed";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const { user, loading, signOut, subscribed, subscriptionTier } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    agencies: [] as string[],
    industries: [] as string[],
    urgency: [] as string[],
    signalTypes: [] as string[],
    dateRange: "7days" as string
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleFilterChange = (filterType: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType as keyof typeof prev].includes(value)
        ? (prev[filterType as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[filterType as keyof typeof prev] as string[]), value]
    }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      agencies: [],
      industries: [],
      urgency: [],
      signalTypes: [],
      dateRange: "7days"
    });
    setSearchQuery("");
  };

  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce((count, filters) => {
      if (Array.isArray(filters)) {
        return count + filters.length;
      }
      return filters !== "7days" ? count + 1 : count;
    }, 0);
  };

  return (
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
              <Button variant="ghost" size="sm">Alerts</Button>
              <Button variant="ghost" size="sm">Saved Items</Button>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={subscribed ? "default" : "secondary"}>
              {subscriptionTier ? subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1) : "Free"}
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
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <AlertTriangle className="h-4 w-4 text-urgency-high" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coverage</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
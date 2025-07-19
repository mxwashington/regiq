import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RegulatorySearch } from '@/components/RegulatorySearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Zap, 
  Target, 
  Clock,
  Shield,
  ArrowLeft
} from 'lucide-react';

export default function SearchPage() {
  const { user, loading, subscribed, subscriptionTier } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const searchLimits = {
    free: 5,
    starter: 25,
    professional: 100,
    enterprise: 500
  };

  const currentTier = subscribed ? subscriptionTier : 'free';
  const dailyLimit = searchLimits[currentTier as keyof typeof searchLimits] || 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Search className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Regulatory Search</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={subscribed ? "default" : "secondary"}>
              {currentTier?.charAt(0).toUpperCase() + currentTier?.slice(1)} Plan
            </Badge>
            <Badge variant="outline">
              {dailyLimit} searches/day
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">AI-Powered Regulatory Intelligence</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Search for real-time regulatory information from FDA, USDA, EPA, and other government sources using advanced AI. 
            Get instant answers with official citations and urgency scoring.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <CardHeader className="pb-2">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Real-Time Search</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access the latest regulatory updates as they happen
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Official Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Results cite official government websites and documents
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2">
              <Target className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Urgency Scoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI-powered priority scoring for regulatory updates
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader className="pb-2">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Smart Caching</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                1-hour caching for faster results and cost efficiency
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Search Component */}
        <RegulatorySearch />

        {/* Upgrade Prompt for Free Users */}
        {!subscribed && (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Unlock More Searches</span>
              </CardTitle>
              <CardDescription>
                Get unlimited regulatory intelligence with a RegIQ subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">25</div>
                  <div className="text-sm text-muted-foreground">Starter Plan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">100</div>
                  <div className="text-sm text-muted-foreground">Professional Plan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">500</div>
                  <div className="text-sm text-muted-foreground">Enterprise Plan</div>
                </div>
              </div>
              <Button className="w-full" onClick={() => navigate('/subscription')}>
                Upgrade Your Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
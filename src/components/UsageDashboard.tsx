import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { Link } from 'react-router-dom';
import { Search, AlertCircle, Bookmark, Zap } from 'lucide-react';

interface UsageData {
  usage_type: string;
  usage_count: number;
  period_start: string;
  period_end: string;
}

export const UsageDashboard: React.FC = () => {
  const { user } = useAuth();
  const { subscribed, subscriptionTier } = useUserProfile();
  const { getPlanLimits } = usePlanRestrictions();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUsageData();
    }
  }, [user]);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user?.id)
        .gte('period_end', new Date().toISOString())
        .order('usage_type');

      if (error) throw error;
      setUsageData(data || []);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const limits = getPlanLimits();

  const getUsageInfo = (type: string) => {
    const usage = usageData.find(u => u.usage_type === type);
    let limit = 0;
    let icon = <Search className="h-4 w-4" />;
    let label = '';
    let period = 'month';

    switch (type) {
      case 'queries':
        limit = limits.queries_per_month;
        label = 'Search Queries';
        period = 'month';
        icon = <Search className="h-4 w-4" />;
        break;
      case 'alerts':
        limit = limits.alerts_per_day;
        label = 'Alerts Viewed';
        period = 'day';
        icon = <AlertCircle className="h-4 w-4" />;
        break;
      case 'saved_searches':
        limit = limits.saved_searches;
        label = 'Saved Searches';
        period = 'month';
        icon = <Bookmark className="h-4 w-4" />;
        break;
    }

    const current = usage?.usage_count || 0;
    const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
    const isUnlimited = limit === -1;

    return { current, limit, percentage, isUnlimited, icon, label, period };
  };

  const getPlanBadgeColor = () => {
    if (!subscribed) return 'secondary';
    if (subscriptionTier === 'Enterprise') return 'default';
    if (subscriptionTier === 'Premium') return 'default';
    return 'secondary';
  };

  const getCurrentPlanName = () => {
    if (subscribed) return subscriptionTier || 'Starter';
    return 'Starter';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Your Plan & Usage
            </CardTitle>
            <Badge variant={getPlanBadgeColor()}>
              {getCurrentPlanName()} Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {['queries', 'alerts', 'saved_searches'].map((type) => {
              const info = getUsageInfo(type);
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {info.icon}
                      <span className="text-sm font-medium">{info.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      per {info.period}
                    </span>
                  </div>
                  
                  {info.isUnlimited ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-primary rounded-full flex-1"></div>
                      <span className="text-sm font-medium">Unlimited</span>
                    </div>
                  ) : (
                    <>
                      <Progress value={info.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{info.current} used</span>
                        <span>{info.limit} limit</span>
                      </div>
                    </>
                  )}
                  
                  {info.percentage >= 80 && !info.isUnlimited && (
                    <p className="text-xs text-amber-600">
                      Approaching limit
                    </p>
                  )}
                  
                  {info.percentage >= 100 && !info.isUnlimited && (
                    <p className="text-xs text-destructive">
                      Limit reached
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          
          {!subscribed && (
            <div className="mt-6 p-4 border border-amber-200 bg-amber-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Upgrade for more usage
                  </p>
                  <p className="text-xs text-amber-700">
                    Get unlimited searches, API access, and advanced features
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link to="/pricing">
                    Upgrade Plan
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
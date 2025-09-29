import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  Brain, 
  Search, 
  Download, 
  Code, 
  BookmarkPlus,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const UsageDashboard: React.FC = () => {
  const { getUsageSummary, getTierLimits } = useUsageLimits();
  const { subscribed, subscriptionTier } = useUserProfile();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const currentTier = subscriptionTier || 'starter';
  const limits = getTierLimits(currentTier);

  useEffect(() => {
    const fetchSummary = async () => {
      const data = await getUsageSummary();
      setSummary(data);
      setLoading(false);
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getUsageColor = (current: number, limit: number) => {
    if (limit === -1) return 'text-success';
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 80) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = (current: number, limit: number) => {
    if (limit === -1) return 'bg-success';
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 80) return 'bg-warning';
    return 'bg-primary';
  };

  const usageItems = [
    {
      icon: Brain,
      label: 'AI Summaries',
      current: summary?.usage?.ai_summaries || 0,
      limit: limits.ai_summaries,
      description: 'AI-powered alert summaries'
    },
    {
      icon: Search,
      label: 'AI Searches',
      current: summary?.usage?.ai_searches || 0,
      limit: limits.ai_searches,
      description: 'Perplexity-powered searches'
    },
    {
      icon: Download,
      label: 'Exports',
      current: summary?.usage?.exports || 0,
      limit: limits.exports,
      description: 'PDF/CSV exports'
    },
    {
      icon: Code,
      label: 'API Calls',
      current: summary?.usage?.api_calls || 0,
      limit: limits.api_calls,
      description: 'API requests'
    },
    {
      icon: BookmarkPlus,
      label: 'Saved Alerts',
      current: summary?.usage?.saved_alerts || 0,
      limit: limits.saved_alerts,
      description: 'Total saved alerts'
    }
  ];

  const planDisplayName = {
    starter: 'Starter (Free)',
    growth: 'Growth ($29/mo)',
    professional: 'Professional ($199/mo)'
  }[currentTier] || 'Free';

  const periodEnd = summary?.billing_period?.end 
    ? format(new Date(summary.billing_period.end), 'MMM d, yyyy')
    : '';

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage & Limits
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Current plan: <Badge variant="secondary">{planDisplayName}</Badge>
            </p>
          </div>
          {periodEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Resets: {periodEnd}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {usageItems.map((item) => {
          const Icon = item.icon;
          const isUnlimited = item.limit === -1;
          const percentage = isUnlimited ? 0 : Math.min((item.current / item.limit) * 100, 100);
          const isAtLimit = !isUnlimited && item.current >= item.limit;
          const isNearLimit = !isUnlimited && item.current >= item.limit * 0.8;

          // Skip showing items that are not available (limit = 0)
          if (item.limit === 0) return null;

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getUsageColor(item.current, item.limit)}`}>
                    {isUnlimited ? 'Unlimited' : `${item.current}/${item.limit}`}
                  </p>
                  {!isUnlimited && (
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(0)}% used
                    </p>
                  )}
                </div>
              </div>
              
              {!isUnlimited && (
                <>
                  <Progress value={percentage} className="h-2" />
                  {isAtLimit && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Limit reached. Upgrade to continue.
                    </p>
                  )}
                  {isNearLimit && !isAtLimit && (
                    <p className="text-xs text-warning font-medium">
                      ⚠️ Approaching limit. Consider upgrading.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}

        {currentTier !== 'professional' && (
          <div className="pt-4 border-t">
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <p className="font-medium">Need more?</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock higher limits and premium features
              </p>
              <Button asChild className="w-full">
                <Link to="/pricing">
                  View Plans
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>
            <strong>Note:</strong> Additional AI summaries and searches available with overage charges capped at next tier price.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

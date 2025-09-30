import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSimpleAlerts } from "@/hooks/useSimpleAlerts";
import { useAlertFilters } from "@/hooks/useAlertFilters";
import { Globe, Loader2 } from "lucide-react";
import { ThirdShiftStatusIndicator } from "./ThirdShiftStatusIndicator";
import PerplexityAlertCard from "./PerplexityAlertCard";
import { logger } from '@/lib/logger';

interface Alert {
  id: string;
  title: string;
  source: string;
  agency?: string;
  published_date: string;
  summary: string;
  urgency: string;
  external_url?: string;
  full_content?: string;
}

interface RegIQFeedProps {
  onSaveAlert?: (alert: Alert) => void;
  savedAlerts?: Alert[];
}

export function RegIQFeed({ onSaveAlert, savedAlerts = [] }: RegIQFeedProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Use alert filters hook for filtering
  const { filters: alertFilters } = useAlertFilters();

  // Fetch alerts data with filters (filtering is done at the hook level)
  const { alerts: fetchedAlerts, loading, loadMore, hasMore } = useSimpleAlerts(50, alertFilters);

  // Convert to Alert format - filtering is already handled by useAlertFilters
  const alerts = useMemo(() => {
    const converted = (fetchedAlerts || []).map((alert: any): Alert => ({
      id: alert.id,
      title: alert.title,
      source: alert.source,
      agency: alert.agency,
      published_date: alert.published_date,
      summary: alert.summary,
      urgency: alert.urgency,
      external_url: alert.external_url,
      full_content: alert.full_content
    }));
    
    logger.info('[RegIQFeed] Converted alerts:', {
      fetchedCount: fetchedAlerts?.length || 0,
      convertedCount: converted.length,
      loading,
      sampleConverted: converted[0]
    });
    return converted;
  }, [fetchedAlerts, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading RegIQ feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RegIQ Feed</h1>
          <p className="text-muted-foreground">
            {alerts.length} regulatory updates • Real-time intelligence
          </p>
        </div>
        <ThirdShiftStatusIndicator />
      </div>

      {/* Feed */}
      <div className="space-y-4 w-full">
        {alerts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {alertFilters.searchQuery
                    ? "No alerts match your search criteria. Try adjusting your filters or search terms."
                    : "No alerts match your current filters. Try expanding your date range or including more sources."
                  }
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {alerts.map((alert) => (
              <PerplexityAlertCard
                key={alert.id}
                alert={alert}
                onSaveAlert={onSaveAlert}
                savedAlerts={savedAlerts}
                showEnhancedDetails={true}
              />
            ))}
            
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={async () => {
                    setIsLoadingMore(true);
                    await loadMore();
                    setIsLoadingMore(false);
                  }}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading more alerts...
                    </>
                  ) : (
                    'Load More Alerts'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
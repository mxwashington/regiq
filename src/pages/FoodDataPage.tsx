import React, { useState } from "react";
import { FoodDataCentralFeed } from "@/components/FoodDataCentralFeed";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FoodDataPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingEconomic, setIsRefreshingEconomic] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      toast({
        title: "Starting food data sync...",
        description: "This may take 30-60 seconds to complete.",
      });

      const { data, error } = await supabase.functions.invoke('usda-fooddata-scraper', {
        body: { manual_trigger: true },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Food data sync completed!",
        description: `Processed ${data.totalProcessed} items, saved ${data.totalSaved} new products.`,
      });

      // Reload the page to show new data
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error refreshing food data:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync food data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEconomicRefresh = async () => {
    setIsRefreshingEconomic(true);
    try {
      toast({
        title: "Starting economic data sync...",
        description: "Fetching USDA ARMS financial stress indicators. This may take 2-3 minutes.",
      });

      const { data, error } = await supabase.functions.invoke('usda-arms-scraper', {
        body: { manual_trigger: true },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Economic data sync completed!",
        description: `Processed ${data.totalProcessed} indicators, saved ${data.totalSaved} new economic alerts.`,
      });

      // Navigate to dashboard to see economic alerts
      setTimeout(() => window.location.href = '/dashboard', 1000);
    } catch (error) {
      console.error('Error refreshing economic data:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync economic data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingEconomic(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">USDA Food Data Central</h1>
          <p className="text-muted-foreground mt-1">
            Nutrition and ingredient data cross-referenced with current recalls
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="lg"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Food Data
            </>
          )}
        </Button>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-amber-600" />
            <CardTitle>USDA Economic Intelligence</CardTitle>
          </div>
          <CardDescription>
            Monitor financial stress indicators in food production sectors to anticipate supplier compliance risks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                USDA ARMS data tracks debt repayment capacity, profit margins, and government support levels across dairy, poultry, beef, and produce sectors. 
                High financial stress correlates with increased compliance shortcuts and quality control risks.
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Farm debt-to-asset ratios by production specialty</li>
                <li>• Operating profit margins and repayment capacity</li>
                <li>• Government payment dependence indicators</li>
                <li>• Economic pressure alerts for your supply chain</li>
              </ul>
            </div>
            <Button
              onClick={handleEconomicRefresh}
              disabled={isRefreshingEconomic}
              variant="outline"
              size="lg"
              className="border-amber-600 text-amber-700 hover:bg-amber-100"
            >
              {isRefreshingEconomic ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Sync Economic Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <FoodDataCentralFeed />
    </div>
  );
}

import React, { useState } from "react";
import { FoodDataCentralFeed } from "@/components/FoodDataCentralFeed";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2 } from "lucide-react";

export default function FoodDataPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      
      <FoodDataCentralFeed />
    </div>
  );
}

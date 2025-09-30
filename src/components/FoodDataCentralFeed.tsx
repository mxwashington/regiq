import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle, Package } from "lucide-react";
import { useSimpleAlerts } from "@/hooks/useSimpleAlerts";
import { Skeleton } from "@/components/ui/skeleton";

interface FoodDataItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  ingredients?: string;
  dataType: string;
  publishedDate: string;
  modifiedDate: string;
  foodNutrients?: Array<{
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

export function FoodDataCentralFeed() {
  // Fetch all USDA alerts and filter for FDC source
  const { alerts: allUsda, loading } = useSimpleAlerts(500, {
    sources: ['USDA'],
    sinceDays: 365,
    minSeverity: null,
    searchQuery: '',
  });

  // Filter for USDA-FDC specifically
  const foodDataAlerts = useMemo(() => {
    return allUsda.filter(a => a.source === 'USDA-FDC');
  }, [allUsda]);

  // Get all alerts to cross-reference with recalls
  const { alerts: allAlerts } = useSimpleAlerts(500, {
    sources: ['FDA', 'FSIS', 'USDA'],
    sinceDays: 30,
    minSeverity: null,
    searchQuery: '',
  });

  // Identify foods that match current recalls
  const matchedRecalls = useMemo(() => {
    const recallKeywords = new Set<string>();
    
    allAlerts
      .filter(a => ['FDA', 'FSIS', 'USDA'].includes(a.source || ''))
      .forEach(alert => {
        const text = `${alert.title} ${alert.summary}`.toLowerCase();
        const words = text.match(/\b[a-z]{4,}\b/g) || [];
        words.forEach(w => recallKeywords.add(w));
      });

    return foodDataAlerts.filter(food => {
      const foodText = `${food.title} ${food.summary}`.toLowerCase();
      return Array.from(recallKeywords).some(keyword => foodText.includes(keyword));
    });
  }, [foodDataAlerts, allAlerts]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">USDA FoodData Central</h2>
          <p className="text-muted-foreground">
            Nutrition and ingredient data for food products
          </p>
        </div>
        <Badge variant="secondary">
          {foodDataAlerts.length} Products
        </Badge>
      </div>

      {matchedRecalls.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-warning">Potential Recall Matches</CardTitle>
            </div>
            <CardDescription>
              These products may be related to current FDA/FSIS recalls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matchedRecalls.map(food => (
                <FoodDataCard key={food.id} alert={food} isRecallMatch />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {foodDataAlerts
          .filter(f => !matchedRecalls.find(m => m.id === f.id))
          .map(food => (
            <FoodDataCard key={food.id} alert={food} />
          ))}
      </div>

      {foodDataAlerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              No food data products available yet. The scraper runs every 12 hours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FoodDataCardProps {
  alert: any;
  isRecallMatch?: boolean;
}

function FoodDataCard({ alert, isRecallMatch }: FoodDataCardProps) {
  let foodData: FoodDataItem | null = null;
  
  try {
    foodData = JSON.parse(alert.full_content || '{}') as FoodDataItem;
  } catch {
    foodData = null;
  }

  const topNutrients = foodData?.foodNutrients?.slice(0, 4) || [];

  return (
    <Card className={isRecallMatch ? 'border-warning' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isRecallMatch && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Recall Match
                </Badge>
              )}
              <Badge variant="secondary">
                {foodData?.dataType || 'Branded'}
              </Badge>
            </div>
            <CardTitle className="text-lg">{alert.title}</CardTitle>
            {foodData?.brandOwner && (
              <CardDescription className="mt-1">
                Brand: {foodData.brandOwner}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {foodData?.ingredients && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Ingredients</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {foodData.ingredients}
            </p>
          </div>
        )}

        {topNutrients.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Key Nutrients</h4>
            <div className="grid grid-cols-2 gap-2">
              {topNutrients.map((nutrient, idx) => (
                <div key={idx} className="text-sm">
                  <span className="text-muted-foreground">{nutrient.nutrientName}:</span>{' '}
                  <span className="font-medium">
                    {nutrient.value} {nutrient.unitName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            FDC ID: {foodData?.fdcId}
          </span>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={alert.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              View Details
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

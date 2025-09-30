import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayCircle, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ScraperStatus {
  source: string;
  lastSuccess: string | null;
  lastAttempt: string | null;
  status: string;
  errorMessage: string | null;
  recordsFetched: number;
  alertCount: number;
}

const AVAILABLE_SCRAPERS = [
  { name: 'USDA-FDC', function: 'usda-fooddata-scraper', description: 'USDA Food Composition Database' },
  { name: 'USDA-ARMS', function: 'usda-arms-scraper', description: 'USDA Economic Research Service' },
  { name: 'TTB', function: 'ttb-rss-scraper', description: 'Alcohol Tobacco Tax Bureau' },
  { name: 'NOAA', function: 'noaa-fisheries-scraper', description: 'NOAA Fisheries Advisories' },
  { name: 'FSIS', function: 'fsis-rss-feeds', description: 'USDA Food Safety Inspection' },
  { name: 'CBP', function: 'cbp-customs-scraper', description: 'Customs & Border Protection' },
  { name: 'USDA-APHIS', function: 'usda-aphis-scraper', description: 'Animal & Plant Health' },
  { name: 'EPA', function: 'epa-echo-api', description: 'EPA Environmental Compliance' },
  { name: 'FDA-Import', function: 'fda-import-alerts', description: 'FDA Import Restrictions' },
  { name: 'OSHA', function: 'osha-scraper', description: 'Workplace Safety Enforcement' },
];

export function ScraperHealthDashboard() {
  const [scraperData, setScraperData] = useState<ScraperStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchScraperHealth = async () => {
    try {
      setLoading(true);

      // Fetch data freshness for all sources
      const { data: freshnessData } = await supabase
        .from('data_freshness')
        .select('*')
        .order('last_attempt', { ascending: false });

      // Fetch alert counts per source
      const { data: alertCounts } = await supabase
        .from('alerts')
        .select('source')
        .gte('published_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      const countMap = alertCounts?.reduce((acc, alert) => {
        acc[alert.source] = (acc[alert.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const statuses: ScraperStatus[] = AVAILABLE_SCRAPERS.map(scraper => {
        const freshness = freshnessData?.find(f => f.source_name === scraper.name);
        return {
          source: scraper.name,
          lastSuccess: freshness?.last_successful_fetch || null,
          lastAttempt: freshness?.last_attempt || null,
          status: freshness?.fetch_status || 'unknown',
          errorMessage: freshness?.error_message || null,
          recordsFetched: freshness?.records_fetched || 0,
          alertCount: countMap[scraper.name] || 0,
        };
      });

      setScraperData(statuses);
    } catch (error) {
      console.error('Error fetching scraper health:', error);
      toast.error('Failed to load scraper health data');
    } finally {
      setLoading(false);
    }
  };

  const triggerScraper = async (functionName: string, sourceName: string) => {
    try {
      setTriggering(sourceName);
      toast.info(`Triggering ${sourceName} scraper...`);

      const { error } = await supabase.functions.invoke(functionName);

      if (error) throw error;

      toast.success(`${sourceName} scraper completed successfully`);
      await fetchScraperHealth();
    } catch (error) {
      console.error(`Error triggering ${sourceName}:`, error);
      toast.error(`Failed to trigger ${sourceName} scraper`);
    } finally {
      setTriggering(null);
    }
  };

  useEffect(() => {
    fetchScraperHealth();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Source Health Monitor</CardTitle>
            <CardDescription>
              Monitor scraper status and manually trigger data collection
            </CardDescription>
          </div>
          <Button 
            onClick={fetchScraperHealth} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Alert Count (90d)</TableHead>
              <TableHead>Last Success</TableHead>
              <TableHead>Last Attempt</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scraperData.map((scraper) => {
              const scraperConfig = AVAILABLE_SCRAPERS.find(s => s.name === scraper.source);
              return (
                <TableRow key={scraper.source}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(scraper.status)}
                      <div>
                        <div className="font-medium">{scraper.source}</div>
                        <div className="text-xs text-muted-foreground">
                          {scraperConfig?.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(scraper.status)}</TableCell>
                  <TableCell>
                    <Badge variant={scraper.alertCount > 0 ? "default" : "secondary"}>
                      {scraper.alertCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {scraper.lastSuccess 
                      ? formatDistanceToNow(new Date(scraper.lastSuccess), { addSuffix: true })
                      : <span className="text-muted-foreground">Never</span>
                    }
                  </TableCell>
                  <TableCell className="text-sm">
                    {scraper.lastAttempt 
                      ? formatDistanceToNow(new Date(scraper.lastAttempt), { addSuffix: true })
                      : <span className="text-muted-foreground">Never</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerScraper(scraperConfig!.function, scraper.source)}
                      disabled={triggering === scraper.source}
                    >
                      {triggering === scraper.source ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      <span className="ml-2">Test</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {scraperData.some(s => s.errorMessage) && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-red-700">Recent Errors:</h4>
            {scraperData
              .filter(s => s.errorMessage)
              .map(s => (
                <div key={s.source} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                  <span className="font-medium">{s.source}:</span> {s.errorMessage}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
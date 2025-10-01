import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, PlayCircle, CheckCircle, XCircle, Database, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface SyncFunction {
  name: string;
  display: string;
  description: string;
  category: 'fda' | 'usda' | 'multi-agency' | 'specialized';
}

const SYNC_FUNCTIONS: SyncFunction[] = [
  // FDA Functions
  {
    name: 'fetch-openfda-enforcement',
    display: 'FDA Enforcement Reports',
    description: 'Food, Drug, Device recalls (last 30 days)',
    category: 'fda'
  },
  {
    name: 'fetch-faers-adverse-events',
    display: 'FAERS Adverse Events',
    description: 'Drug adverse events (last 90 days)',
    category: 'fda'
  },
  {
    name: 'fda-import-alerts',
    display: 'FDA Import Alerts',
    description: 'Import detention alerts',
    category: 'fda'
  },
  {
    name: 'fda-warning-letters',
    display: 'FDA Warning Letters',
    description: 'Enforcement warning letters',
    category: 'fda'
  },
  {
    name: 'fda-compliance-pipeline',
    display: 'FDA Inspection Citations',
    description: 'Form 483 observations',
    category: 'fda'
  },
  
  // USDA Functions
  {
    name: 'fsis-rss-feeds',
    display: 'FSIS Recalls (USDA)',
    description: 'Meat, poultry, egg product recalls',
    category: 'usda'
  },
  {
    name: 'usda-aphis-scraper',
    display: 'USDA APHIS',
    description: 'Animal health & plant protection',
    category: 'usda'
  },
  {
    name: 'usda-ams-api',
    display: 'USDA AMS',
    description: 'Agricultural marketing service data',
    category: 'usda'
  },
  {
    name: 'usda-arms-scraper',
    display: 'USDA ARMS',
    description: 'Economic research service data',
    category: 'usda'
  },
  {
    name: 'usda-fooddata-scraper',
    display: 'USDA FoodData Central',
    description: 'Food composition database',
    category: 'usda'
  },
  
  // Multi-Agency
  {
    name: 'multi-agency-rss-scraper',
    display: 'Multi-Agency RSS',
    description: 'CDC, EPA, NOAA RSS feeds',
    category: 'multi-agency'
  },
  {
    name: 'enhanced-regulatory-apis',
    display: 'Enhanced Regulatory APIs',
    description: 'Multiple API sources',
    category: 'multi-agency'
  },
  {
    name: 'regulations-gov-api',
    display: 'Regulations.gov',
    description: 'Federal regulations & dockets',
    category: 'multi-agency'
  },
  
  // Specialized
  {
    name: 'osha-scraper',
    display: 'OSHA',
    description: 'Workplace safety enforcement',
    category: 'specialized'
  },
  {
    name: 'epa-echo-api',
    display: 'EPA ECHO',
    description: 'Environmental compliance',
    category: 'specialized'
  },
  {
    name: 'cbp-customs-scraper',
    display: 'CBP Customs',
    description: 'Customs & border protection',
    category: 'specialized'
  },
  {
    name: 'noaa-fisheries-scraper',
    display: 'NOAA Fisheries',
    description: 'Seafood advisories & closures',
    category: 'specialized'
  },
  {
    name: 'ttb-rss-scraper',
    display: 'TTB',
    description: 'Alcohol & tobacco regulation',
    category: 'specialized'
  }
];

export const UnifiedDataSyncDashboard = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [lastSync, setLastSync] = useState<Record<string, string>>({});

  const triggerFunction = async (functionName: string, displayName: string) => {
    setLoading(prev => ({ ...prev, [functionName]: true }));
    
    try {
      logger.info(`[UnifiedSync] Triggering ${functionName}`);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { days: 30, action: 'sync' }
      });

      if (error) throw error;

      setLastSync(prev => ({ ...prev, [functionName]: new Date().toISOString() }));

      toast.success(`${displayName} Sync Complete`, {
        description: data?.message || `Processed ${data?.processed || 0} items`,
      });

      logger.info(`[UnifiedSync] ${functionName} completed:`, data);
    } catch (error) {
      logger.error(`[UnifiedSync] ${functionName} failed:`, error);
      toast.error(`${displayName} Sync Failed`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(prev => ({ ...prev, [functionName]: false }));
    }
  };

  const triggerAll = async () => {
    toast.info('Starting sync for all sources...');
    
    for (const func of SYNC_FUNCTIONS) {
      await triggerFunction(func.name, func.display);
      // Rate limiting between functions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    toast.success('All sources sync completed!');
  };

  const triggerCategory = async (category: string) => {
    const funcsInCategory = SYNC_FUNCTIONS.filter(f => f.category === category);
    toast.info(`Starting sync for ${category} sources...`);
    
    for (const func of funcsInCategory) {
      await triggerFunction(func.name, func.display);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    toast.success(`${category} sync completed!`);
  };

  const renderFunctionCard = (func: SyncFunction) => (
    <div key={func.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium">{func.display}</p>
          {lastSync[func.name] && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Synced
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{func.description}</p>
      </div>
      <Button
        onClick={() => triggerFunction(func.name, func.display)}
        disabled={loading[func.name]}
        size="sm"
      >
        {loading[func.name] ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <PlayCircle className="mr-2 h-4 w-4" />
            Sync Now
          </>
        )}
      </Button>
    </div>
  );

  const fdaFunctions = SYNC_FUNCTIONS.filter(f => f.category === 'fda');
  const usdaFunctions = SYNC_FUNCTIONS.filter(f => f.category === 'usda');
  const multiAgencyFunctions = SYNC_FUNCTIONS.filter(f => f.category === 'multi-agency');
  const specializedFunctions = SYNC_FUNCTIONS.filter(f => f.category === 'specialized');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Unified Data Sync & Sources
            </CardTitle>
            <CardDescription>
              Centralized dashboard to sync all regulatory data sources
            </CardDescription>
          </div>
          <Button onClick={triggerAll} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync All Sources
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({SYNC_FUNCTIONS.length})</TabsTrigger>
            <TabsTrigger value="fda">FDA ({fdaFunctions.length})</TabsTrigger>
            <TabsTrigger value="usda">USDA ({usdaFunctions.length})</TabsTrigger>
            <TabsTrigger value="multi">Multi-Agency ({multiAgencyFunctions.length})</TabsTrigger>
            <TabsTrigger value="specialized">Specialized ({specializedFunctions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            <div className="flex justify-end mb-2">
              <Button onClick={triggerAll} size="sm" variant="outline">
                <PlayCircle className="h-4 w-4 mr-2" />
                Sync All
              </Button>
            </div>
            {SYNC_FUNCTIONS.map(renderFunctionCard)}
          </TabsContent>

          <TabsContent value="fda" className="space-y-3 mt-4">
            <div className="flex justify-end mb-2">
              <Button onClick={() => triggerCategory('fda')} size="sm" variant="outline">
                <PlayCircle className="h-4 w-4 mr-2" />
                Sync All FDA
              </Button>
            </div>
            {fdaFunctions.map(renderFunctionCard)}
          </TabsContent>

          <TabsContent value="usda" className="space-y-3 mt-4">
            <div className="flex justify-end mb-2">
              <Button onClick={() => triggerCategory('usda')} size="sm" variant="outline">
                <PlayCircle className="h-4 w-4 mr-2" />
                Sync All USDA
              </Button>
            </div>
            {usdaFunctions.map(renderFunctionCard)}
          </TabsContent>

          <TabsContent value="multi" className="space-y-3 mt-4">
            <div className="flex justify-end mb-2">
              <Button onClick={() => triggerCategory('multi-agency')} size="sm" variant="outline">
                <PlayCircle className="h-4 w-4 mr-2" />
                Sync Multi-Agency
              </Button>
            </div>
            {multiAgencyFunctions.map(renderFunctionCard)}
          </TabsContent>

          <TabsContent value="specialized" className="space-y-3 mt-4">
            <div className="flex justify-end mb-2">
              <Button onClick={() => triggerCategory('specialized')} size="sm" variant="outline">
                <PlayCircle className="h-4 w-4 mr-2" />
                Sync Specialized
              </Button>
            </div>
            {specializedFunctions.map(renderFunctionCard)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
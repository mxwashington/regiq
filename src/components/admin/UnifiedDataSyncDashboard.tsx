import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, PlayCircle, CheckCircle, AlertCircle, Database, RefreshCw, ChevronRight } from 'lucide-react';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

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

interface SyncResult {
  success: boolean;
  processed?: number;
  error?: string;
}

export const UnifiedDataSyncDashboard = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [lastSync, setLastSync] = useState<Record<string, { timestamp: string; success: boolean; message?: string }>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const triggerFunction = async (functionName: string, displayName: string) => {
    setLoading(prev => ({ ...prev, [functionName]: true }));
    
    try {
      logger.info(`[UnifiedSync] Triggering ${functionName}`);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { days: 30, action: 'sync' }
      });

      if (error) throw error;

      const result = data as SyncResult;
      const success = result.success !== false;

      setLastSync(prev => ({ 
        ...prev, 
        [functionName]: { 
          timestamp: new Date().toISOString(),
          success,
          message: result.error || (result.processed !== undefined ? `Processed ${result.processed} items` : 'Completed')
        }
      }));

      if (success) {
        toast.success(`${displayName} Sync Complete`, {
          description: result.processed !== undefined 
            ? `Processed ${result.processed} items` 
            : data?.message || 'Sync completed successfully',
        });
      } else {
        toast.warning(`${displayName} Sync Completed with Warnings`, {
          description: result.error || 'Check logs for details'
        });
      }

      logger.info(`[UnifiedSync] ${functionName} completed:`, data);
    } catch (error) {
      logger.error(`[UnifiedSync] ${functionName} failed:`, error);
      
      setLastSync(prev => ({ 
        ...prev, 
        [functionName]: { 
          timestamp: new Date().toISOString(),
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyMessage = errorMsg;
      
      // Provide actionable error messages
      if (errorMsg.includes('404')) {
        userFriendlyMessage = 'Data source unavailable (404). The URL may have changed.';
      } else if (errorMsg.includes('403')) {
        userFriendlyMessage = 'Access denied (403). API may require authentication or have IP restrictions.';
      } else if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
        userFriendlyMessage = 'API server error (500). Please retry in a few minutes.';
      } else if (errorMsg.includes('timeout')) {
        userFriendlyMessage = 'Request timed out. The API may be slow or unreachable.';
      } else if (errorMsg.includes('non-2xx status code')) {
        userFriendlyMessage = 'Sync function returned an error. Check Edge Function logs for details.';
      }
      
      toast.error(`${displayName} Sync Failed`, {
        description: userFriendlyMessage,
        action: {
          label: 'Retry',
          onClick: () => triggerFunction(functionName, displayName)
        }
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

  const renderFunctionCard = (func: SyncFunction) => {
    const syncStatus = lastSync[func.name];
    const isLoading = loading[func.name];
    
    return (
      <div 
        key={func.name} 
        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-medium text-sm">{func.display}</p>
            {syncStatus && (
              <Badge 
                variant={syncStatus.success ? "default" : "destructive"} 
                className="text-xs shrink-0"
              >
                {syncStatus.success ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Synced
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">{func.description}</p>
          {syncStatus && (
            <p className="text-xs text-muted-foreground">
              {syncStatus.message || 'No details available'}
            </p>
          )}
        </div>
        <Button
          onClick={() => triggerFunction(func.name, func.display)}
          disabled={isLoading}
          size="sm"
          className="shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  };

  const categories = [
    { value: 'all', label: 'All Sources', count: SYNC_FUNCTIONS.length },
    { value: 'fda', label: 'FDA', count: SYNC_FUNCTIONS.filter(f => f.category === 'fda').length },
    { value: 'usda', label: 'USDA', count: SYNC_FUNCTIONS.filter(f => f.category === 'usda').length },
    { value: 'multi-agency', label: 'Multi-Agency', count: SYNC_FUNCTIONS.filter(f => f.category === 'multi-agency').length },
    { value: 'specialized', label: 'Specialized', count: SYNC_FUNCTIONS.filter(f => f.category === 'specialized').length }
  ];

  const getFilteredFunctions = () => {
    if (selectedCategory === 'all') return SYNC_FUNCTIONS;
    return SYNC_FUNCTIONS.filter(f => f.category === selectedCategory);
  };

  const filteredFunctions = getFilteredFunctions();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sync & Sources
            </CardTitle>
            <CardDescription>
              Centralized dashboard to sync all regulatory data sources
            </CardDescription>
          </div>
          <Button onClick={triggerAll} variant="default" className="gap-2 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            Sync All Sources
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Vertical Sidebar Navigation */}
          <div className="lg:w-48 shrink-0">
            <ScrollArea className="h-auto lg:h-[600px]">
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {categories.map(cat => {
                  const isActive = selectedCategory === cat.value;
                  const categoryFuncs = cat.value === 'all' 
                    ? SYNC_FUNCTIONS 
                    : SYNC_FUNCTIONS.filter(f => f.category === cat.value);
                  
                  const syncedCount = categoryFuncs.filter(f => 
                    lastSync[f.name]?.success
                  ).length;
                  
                  const failedCount = categoryFuncs.filter(f => 
                    lastSync[f.name] && !lastSync[f.name]?.success
                  ).length;
                  
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-colors text-left w-full lg:w-auto whitespace-nowrap lg:whitespace-normal",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">
                          {cat.label}
                        </div>
                        <div className="text-xs opacity-80">
                          {cat.count} source{cat.count !== 1 ? 's' : ''}
                        </div>
                        {(syncedCount > 0 || failedCount > 0) && (
                          <div className="flex gap-2 mt-1">
                            {syncedCount > 0 && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                {syncedCount} ✓
                              </Badge>
                            )}
                            {failedCount > 0 && (
                              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                                {failedCount} ✗
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform lg:block hidden",
                        isActive && "rotate-90"
                      )} />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {categories.find(c => c.value === selectedCategory)?.label}
              </h3>
              {selectedCategory !== 'all' && (
                <Button 
                  onClick={() => triggerCategory(selectedCategory)} 
                  size="sm" 
                  variant="outline"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Sync Category
                </Button>
              )}
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredFunctions.map(renderFunctionCard)}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
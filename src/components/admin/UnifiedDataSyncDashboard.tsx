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
  alerts_inserted?: number;
  alerts_updated?: number;
  alerts_fetched?: number;
  alerts_skipped?: number;
  totalSaved?: number;
  totalProcessed?: number;
  total_alerts?: number;
  inserted?: number;
  fetched?: number;
  message?: string;
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

      if (error) {
        // Enhanced error detection
        const errorMsg = error.message || 'Sync failed';
        throw new Error(errorMsg);
      }

      const result = data as SyncResult;
      const success = result.success !== false;
      
      // Normalize different response formats from various edge functions
      const inserted = result.alerts_inserted || result.totalSaved || result.inserted || 0;
      const updated = result.alerts_updated || 0;
      const fetched = result.alerts_fetched || result.totalProcessed || result.total_alerts || result.fetched || 0;
      const skipped = result.alerts_skipped || 0;
      const totalProcessed = inserted + updated;
      
      // Categorize sync outcomes
      const hasNewAlerts = totalProcessed > 0;
      const isUpToDate = fetched > 0 && skipped > 0 && totalProcessed === 0;
      const noDataAvailable = fetched === 0 && totalProcessed === 0;
      
      logger.info(`[UnifiedSync] ${functionName} results:`, { 
        inserted, updated, fetched, skipped, totalProcessed, hasNewAlerts, isUpToDate, noDataAvailable 
      });

      setLastSync(prev => ({ 
        ...prev, 
        [functionName]: { 
          timestamp: new Date().toISOString(),
          success,
          message: hasNewAlerts
            ? `✅ ${inserted} new, ${updated} updated (${fetched} fetched)`
            : isUpToDate
              ? `✓ Up-to-date (${skipped} duplicates skipped)`
              : noDataAvailable
                ? 'ℹ️ No data available from source'
                : result.message || 'Completed'
        }
      }));

      // Show appropriate toast notification
      if (hasNewAlerts) {
        toast.success(`${displayName}: ${totalProcessed} New Alert${totalProcessed !== 1 ? 's' : ''}`, {
          description: `${inserted} inserted, ${updated} updated from ${fetched} fetched`,
        });
      } else if (isUpToDate) {
        toast.info(`${displayName}: Already Up-to-Date`, {
          description: `All ${skipped} alerts already in database (duplicate prevention working)`,
        });
      } else if (noDataAvailable) {
        toast.info(`${displayName}: No New Data`, {
          description: 'No alerts available from this source at this time',
        });
      } else if (!success || result.error) {
        toast.warning(`${displayName}: Completed with Issues`, {
          description: result.error || result.message || 'Check logs for details',
        });
      } else {
        toast.success(`${displayName}: Sync Complete`, {
          description: result.message || 'Sync completed successfully',
        });
      }

      logger.info(`[UnifiedSync] ${functionName} completed:`, { inserted, updated, fetched, skipped, totalProcessed, success });
    } catch (error) {
      logger.error(`[UnifiedSync] ${functionName} failed:`, error);
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyMessage = errorMsg;
      let suggestedAction = 'Retry';
      
      // Enhanced error categorization
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        userFriendlyMessage = '❌ Data source not found (404). The URL may have been moved or discontinued.';
        suggestedAction = 'Check Source';
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        userFriendlyMessage = '🔒 Access denied (403). API requires authentication or has IP restrictions.';
        suggestedAction = 'Check Auth';
      } else if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error') || errorMsg.includes('502') || errorMsg.includes('503')) {
        userFriendlyMessage = '⚠️ External API error (5xx). The regulatory source is temporarily down.';
        suggestedAction = 'Retry Later';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        userFriendlyMessage = '⏱️ Request timed out. The API is slow or unreachable.';
        suggestedAction = 'Retry';
      } else if (errorMsg.includes('non-2xx') || errorMsg.includes('FunctionsHttpError')) {
        userFriendlyMessage = '🔧 Edge Function error. Check function logs for technical details.';
        suggestedAction = 'View Logs';
      } else if (errorMsg.includes('parse') || errorMsg.includes('parsing')) {
        userFriendlyMessage = '📄 Data parsing failed. The source format may have changed.';
        suggestedAction = 'Report Issue';
      }
      
      setLastSync(prev => ({ 
        ...prev, 
        [functionName]: { 
          timestamp: new Date().toISOString(),
          success: false,
          message: userFriendlyMessage
        }
      }));
      
      toast.error(`${displayName}: Sync Failed`, {
        description: userFriendlyMessage,
        duration: 8000,
        action: {
          label: suggestedAction,
          onClick: () => {
            if (suggestedAction === 'Retry' || suggestedAction === 'Retry Later') {
              triggerFunction(functionName, displayName);
            }
          }
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

  const testNewFDAAdapter = async () => {
    setLoading(prev => ({ ...prev, 'fda-alerts-adapter': true }));
    
    try {
      logger.info('[UnifiedSync] Testing new FDA alerts adapter');
      toast.info('🆕 Testing new FDA adapter...');
      
      const { data, error } = await supabase.functions.invoke('fda-alerts-adapter');

      if (error) throw error;

      const result = data as SyncResult;
      
      if (result.success) {
        const inserted = result.inserted || 0;
        const processed = result.processed || 0;
        const skipped = result.alerts_skipped || 0;
        
        setLastSync(prev => ({ 
          ...prev, 
          'fda-alerts-adapter': { 
            timestamp: new Date().toISOString(),
            success: true,
            message: `✅ ${inserted} new alerts inserted (${processed} processed, ${skipped} skipped)`
          }
        }));
        
        if (inserted > 0) {
          toast.success(`🎉 FDA Adapter Success!`, {
            description: `${inserted} new FDA alerts added to database`,
          });
        } else {
          toast.info(`✓ FDA Adapter: Database Up-to-Date`, {
            description: `All ${skipped} alerts already in database`,
          });
        }
      } else {
        throw new Error(result.error || result.message || 'FDA adapter failed');
      }
      
      logger.info('[UnifiedSync] FDA adapter test completed:', result);
    } catch (error) {
      logger.error('[UnifiedSync] FDA adapter test failed:', error);
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastSync(prev => ({ 
        ...prev, 
        'fda-alerts-adapter': { 
          timestamp: new Date().toISOString(),
          success: false,
          message: `❌ ${errorMsg}`
        }
      }));
      
      toast.error('FDA Adapter Failed', {
        description: errorMsg,
        duration: 8000,
      });
    } finally {
      setLoading(prev => ({ ...prev, 'fda-alerts-adapter': false }));
    }
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
            <>
              <p className={cn(
                "text-xs font-medium",
                syncStatus.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {syncStatus.message || 'No details available'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last sync: {new Date(syncStatus.timestamp).toLocaleString()}
              </p>
            </>
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
              <RefreshCw className="h-4 w-4" />
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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={testNewFDAAdapter} 
              disabled={loading['fda-alerts-adapter']}
              variant="default" 
              className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {loading['fda-alerts-adapter'] ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              🆕 Test FDA Adapter
            </Button>
            <Button onClick={triggerAll} variant="outline" className="gap-2 w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
              Sync All Sources
            </Button>
          </div>
        </div>
        {lastSync['fda-alerts-adapter'] && (
          <div className={cn(
            "mt-4 p-3 rounded-lg border",
            lastSync['fda-alerts-adapter'].success 
              ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
          )}>
            <p className={cn(
              "text-sm font-medium",
              lastSync['fda-alerts-adapter'].success
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            )}>
              FDA Adapter: {lastSync['fda-alerts-adapter'].message}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last test: {new Date(lastSync['fda-alerts-adapter'].timestamp).toLocaleString()}
            </p>
          </div>
        )}
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
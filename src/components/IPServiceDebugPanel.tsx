import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Trash2,
  Info,
  Activity
} from 'lucide-react';
import { ipDetectionService } from '@/services/ipDetection';
import { useIPTracking } from '@/hooks/useIPTracking';

export const IPServiceDebugPanel = () => {
  const [serviceStatus, setServiceStatus] = useState(ipDetectionService.getStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { error, getServiceStatus, clearCache } = useIPTracking();

  const refreshStatus = () => {
    setServiceStatus(ipDetectionService.getStatus());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await ipDetectionService.getCurrentIP();
      refreshStatus();
    } catch (error) {
      logger.error('Failed to refresh IP:', error, 'IPServiceDebugPanel');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = () => {
    clearCache();
    ipDetectionService.resetCircuitBreaker();
    refreshStatus();
  };

  useEffect(() => {
    const interval = setInterval(refreshStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (serviceStatus.circuitOpen) return 'destructive';
    if (serviceStatus.failures > 0) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (serviceStatus.circuitOpen) return <AlertTriangle className="h-4 w-4" />;
    if (serviceStatus.failures > 0) return <Activity className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const formatAge = (age: number | null) => {
    if (!age) return 'No cache';
    const minutes = Math.floor(age / 60000);
    const seconds = Math.floor((age % 60000) / 1000);
    return `${minutes}m ${seconds}s ago`;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          IP Service Debug
        </CardTitle>
        <CardDescription>
          Monitor IP detection service health and performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Service Status:</span>
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {serviceStatus.circuitOpen ? 'Circuit Open' : 
             serviceStatus.failures > 0 ? 'Degraded' : 'Healthy'}
          </Badge>
        </div>

        {/* Failures */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Failures:</span>
          <span className="text-sm">{serviceStatus.failures}/3</span>
        </div>

        {/* Cache Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Cache:</span>
          <div className="flex items-center gap-2">
            {serviceStatus.cached ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatAge(serviceStatus.cacheAge)}
              </Badge>
            ) : (
              <Badge variant="secondary">No cache</Badge>
            )}
          </div>
        </div>

        {/* Current IP */}
        {serviceStatus.lastIP && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last IP:</span>
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {serviceStatus.lastIP}
            </span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error:</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleClearCache}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Cache
          </Button>
        </div>

        {/* Circuit Breaker Warning */}
        {serviceStatus.circuitOpen && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 text-yellow-800 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Circuit Breaker Open</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              IP detection is temporarily disabled due to repeated failures. 
              It will automatically retry after 5 minutes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
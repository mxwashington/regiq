import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Bug, Database, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  pipelineHealth: 'unknown' | 'healthy' | 'degraded' | 'failed';
  lastChecked: Date | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      pipelineHealth: 'unknown',
      lastChecked: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      lastChecked: new Date()
    });

    // Log error details
    logger.error('Enhanced Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Check pipeline health when error occurs
    this.checkPipelineHealth();

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  checkPipelineHealth = async () => {
    try {
      // Check data freshness to assess pipeline health
      const { data: freshness, error } = await supabase
        .from('data_freshness')
        .select('*')
        .order('last_attempt', { ascending: false })
        .limit(5);

      if (error) {
        this.setState({ pipelineHealth: 'failed' });
        return;
      }

      if (!freshness || freshness.length === 0) {
        this.setState({ pipelineHealth: 'failed' });
        return;
      }

      // Check if any sources have recent successful fetches
      const recentSuccess = freshness.some(item => {
        const lastSuccess = new Date(item.last_successful_fetch);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        return lastSuccess > sixHoursAgo && item.fetch_status === 'success';
      });

      // Check for errors in recent attempts
      const recentErrors = freshness.filter(item => {
        const lastAttempt = new Date(item.last_attempt);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastAttempt > oneHourAgo && item.fetch_status === 'error';
      });

      if (recentSuccess && recentErrors.length === 0) {
        this.setState({ pipelineHealth: 'healthy' });
      } else if (recentSuccess || recentErrors.length < 3) {
        this.setState({ pipelineHealth: 'degraded' });
      } else {
        this.setState({ pipelineHealth: 'failed' });
      }

    } catch (err) {
      logger.error('Failed to check pipeline health:', err);
      this.setState({ pipelineHealth: 'failed' });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      pipelineHealth: 'unknown',
      lastChecked: null
    });
  };

  handleRetryWithPipeline = async () => {
    try {
      // Trigger enhanced pipeline
      const { error } = await supabase.functions.invoke('enhanced-regulatory-data-collection');
      if (error) {
        logger.error('Failed to trigger pipeline:', error);
      }
      
      // Wait a moment then reset
      setTimeout(() => {
        this.handleReset();
      }, 2000);
      
    } catch (err) {
      logger.error('Error triggering pipeline:', err);
      this.handleReset();
    }
  };

  getPipelineHealthBadge = () => {
    switch (this.state.pipelineHealth) {
      case 'healthy':
        return <Badge variant="default" className="gap-1"><Database className="h-3 w-3" />Pipeline Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Pipeline Degraded</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><Wifi className="h-3 w-3" />Pipeline Failed</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><RefreshCw className="h-3 w-3" />Checking...</Badge>;
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return <FallbackComponent error={this.state.error!} resetError={this.handleReset} />;
      }

      // Default enhanced error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                The application encountered an unexpected error. Our enhanced error boundary has captured the details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Details */}
              <div className="rounded-md bg-destructive/10 p-4">
                <h4 className="font-medium text-destructive flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Error Details
                </h4>
                <p className="text-sm text-muted-foreground mt-2">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
                {this.state.lastChecked && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Detected at: {this.state.lastChecked.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Pipeline Health Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Data Pipeline Status:</span>
                {this.getPipelineHealthBadge()}
              </div>

              {/* Recovery Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                {this.state.pipelineHealth === 'failed' && (
                  <Button 
                    onClick={this.handleRetryWithPipeline}
                    className="flex-1"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Restart Pipeline & Retry
                  </Button>
                )}
              </div>

              {/* Technical Details (Collapsible) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Technical Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error?.stack}
                  </pre>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
/**
 * Enhanced Error Boundary with Performance Monitoring and Retry Logic
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Bug, Clock, Zap } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  retryDelay?: number;
  enablePerformanceMonitoring?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  errorId: string;
  renderTime?: number;
  errorTimestamp?: number;
  performanceData?: {
    componentCount: number;
    renderDuration: number;
    memoryUsage?: number;
  };
}

export class ErrorBoundaryEnhanced extends Component<Props, State> {
  private retryTimeout?: NodeJS.Timeout;
  private renderStartTime: number = 0;
  private performanceObserver?: PerformanceObserver;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      errorId: this.generateErrorId()
    };

    // Set up performance monitoring
    if (props.enablePerformanceMonitoring && 'PerformanceObserver' in window) {
      this.setupPerformanceMonitoring();
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorTimestamp: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    logger.error(`[ErrorBoundaryEnhanced:${level}] Error caught:`, error, 'ErrorBoundaryEnhanced');
    
    this.setState({
      error,
      errorInfo,
      performanceData: this.getPerformanceData(),
      renderTime: this.renderStartTime ? Date.now() - this.renderStartTime : undefined
    });

    // Call custom error handler
    onError?.(error, errorInfo);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }

    // Auto-retry for component-level errors
    if (level === 'component' && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  componentDidMount() {
    this.renderStartTime = performance.now();
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceMonitoring() {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Process performance entries if needed
      });
      
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      });
    } catch (error) {
      logger.warn('[ErrorBoundaryEnhanced] Performance monitoring setup failed:', error, 'ErrorBoundaryEnhanced');
    }
  }

  private getPerformanceData() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      
      return {
        componentCount: document.querySelectorAll('[data-testid], [role]').length,
        renderDuration: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : undefined // MB
      };
    } catch (error) {
      return {
        componentCount: 0,
        renderDuration: 0
      };
    }
  }

  private scheduleRetry() {
    const delay = this.props.retryDelay || 1000 * Math.pow(2, this.state.retryCount);
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, send to your error tracking service
    const errorData = {
      errorId: this.state.errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      level: this.props.level,
      retryCount: this.state.retryCount,
      performanceData: this.state.performanceData,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: this.state.errorTimestamp
    };

    // Example: Send to your monitoring service
    // errorTrackingService.captureException(errorData);
    logger.info('[ErrorBoundaryEnhanced] Error data for service:', errorData, 'ErrorBoundaryEnhanced');
  }

  private handleRetry = () => {
    logger.info(`[ErrorBoundaryEnhanced] Retrying... (attempt ${this.state.retryCount + 1})`, undefined, 'ErrorBoundaryEnhanced');
    
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
      errorId: this.generateErrorId(),
      renderTime: undefined,
      errorTimestamp: undefined,
      performanceData: undefined
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const { level = 'component' } = this.props;
    const { retryCount } = this.state;

    if (level === 'critical') return 'critical';
    if (level === 'page') return 'high';
    if (retryCount >= 3) return 'high';
    if (retryCount >= 1) return 'medium';
    return 'low';
  }

  private getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const { level = 'component', maxRetries = 3 } = this.props;
      const canRetry = this.state.retryCount < maxRetries && level !== 'critical';
      const isAutoRetrying = canRetry && level === 'component';

      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <Card className={`w-full max-w-2xl border-red-200 ${level === 'page' ? 'min-h-[400px]' : ''}`}>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={`${this.getSeverityColor(severity)} capitalize`}>
                    {severity} Error
                  </Badge>
                  {this.state.retryCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Retry {this.state.retryCount}/{maxRetries}
                    </Badge>
                  )}
                </div>
              </div>
              
              <CardTitle className="text-red-900">
                {level === 'critical' ? 'Critical System Error' : 
                 level === 'page' ? 'Page Error' : 'Component Error'}
              </CardTitle>
              
              <CardDescription className="text-red-700">
                {level === 'critical' 
                  ? 'A critical error has occurred. Please contact support immediately.'
                  : level === 'page'
                  ? 'This page encountered an error. Try refreshing or go back.'
                  : 'A component failed to render properly.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Performance Data */}
              {this.state.performanceData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Performance Impact</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Components: </span>
                      <span className="font-medium">{this.state.performanceData.componentCount}</span>
                    </div>
                    {this.state.renderTime && (
                      <div>
                        <span className="text-blue-700">Render Time: </span>
                        <span className="font-medium">{this.state.renderTime}ms</span>
                      </div>
                    )}
                    {this.state.performanceData.memoryUsage && (
                      <div>
                        <span className="text-blue-700">Memory: </span>
                        <span className="font-medium">{this.state.performanceData.memoryUsage.toFixed(1)}MB</span>
                      </div>
                    )}
                    {this.state.errorTimestamp && (
                      <div>
                        <span className="text-blue-700">Time: </span>
                        <span className="font-medium">
                          {new Date(this.state.errorTimestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Auto-retry indicator */}
              {isAutoRetrying && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600 animate-spin" />
                    <span className="text-yellow-800">Auto-retrying in a moment...</span>
                  </div>
                </div>
              )}

              {/* Debug information */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-900">Debug Information</span>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-red-700 font-medium">
                      Error Details (ID: {this.state.errorId})
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong>Error:</strong> {this.state.error.name}: {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-40 bg-red-100 p-2 rounded">
                          {this.state.error.stack}
                        </pre>
                      )}
                      {this.state.errorInfo && (
                        <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-40 bg-red-100 p-2 rounded">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex gap-2">
                {canRetry && !isAutoRetrying && (
                  <Button onClick={this.handleRetry} className="flex-1" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({maxRetries - this.state.retryCount} left)
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleReload} 
                  variant="outline" 
                  className="flex-1"
                  size="sm"
                >
                  Reload {level === 'page' ? 'Page' : 'App'}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Error ID: {this.state.errorId}
                {level === 'critical' && (
                  <span className="block mt-1 text-red-600">
                    Please provide this ID to support for faster resolution.
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper components
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryEnhanced level="page" maxRetries={1} enablePerformanceMonitoring>
    {children}
  </ErrorBoundaryEnhanced>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryEnhanced level="component" maxRetries={3} retryDelay={2000}>
    {children}
  </ErrorBoundaryEnhanced>
);

export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryEnhanced level="critical" maxRetries={0} enablePerformanceMonitoring>
    {children}
  </ErrorBoundaryEnhanced>
);
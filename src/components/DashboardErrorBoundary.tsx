
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

class DashboardErrorBoundaryCore extends Component<Props & { navigate: (path: string) => void }, State> {
  private retryTimer?: NodeJS.Timeout;

  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });

    // Log to any error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo, 'dashboard');
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount >= 3) {
      console.warn('Maximum retry attempts reached, redirecting to landing');
      this.props.navigate('/');
      return;
    }

    console.log(`Retrying dashboard load (attempt ${this.state.retryCount + 1})`);
    
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleGoHome = () => {
    console.log('Navigating to home from dashboard error');
    this.props.navigate('/');
  };

  private handleReload = () => {
    console.log('Reloading page from dashboard error');
    window.location.reload();
  };

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isAuthError = this.state.error?.message?.includes('auth') || 
                         this.state.error?.message?.includes('session') ||
                         this.state.error?.message?.includes('token');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="w-full max-w-lg border-destructive/20 bg-background">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Dashboard Error</CardTitle>
              <CardDescription>
                {isAuthError 
                  ? "There was an authentication issue loading your dashboard." 
                  : "Something went wrong while loading your dashboard."
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Debug Information</span>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-destructive/80 font-medium mb-2">
                      Error Details (Attempt {this.state.retryCount + 1})
                    </summary>
                    <div className="space-y-2">
                      <div>
                        <strong>Message:</strong> {this.state.error.message}
                      </div>
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 text-xs text-destructive/70 whitespace-pre-wrap overflow-auto max-h-32 bg-background/50 p-2 rounded">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                {this.state.retryCount < 3 ? (
                  <Button onClick={this.handleRetry} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({3 - this.state.retryCount} left)
                  </Button>
                ) : (
                  <Button onClick={this.handleReload} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Page
                  </Button>
                )}
                
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                If this problem persists, try signing out and back in, or contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide navigation
export const DashboardErrorBoundary: React.FC<Props> = ({ children, fallback }) => {
  const navigate = useNavigate();
  
  return (
    <DashboardErrorBoundaryCore navigate={navigate} fallback={fallback}>
      {children}
    </DashboardErrorBoundaryCore>
  );
};

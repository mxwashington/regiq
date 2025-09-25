import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class IPServiceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('IP Service Error Boundary caught an error:', error, 'IPServiceErrorBoundary');
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              IP Service Error
            </CardTitle>
            <CardDescription>
              The IP detection service encountered an error. The application will continue to work normally.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {this.state.error && (
                <div className="text-sm text-muted-foreground">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
              )}
              <Button 
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
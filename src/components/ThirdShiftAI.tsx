import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { FeaturePaywall } from '@/components/paywall/FeaturePaywall';

import { logger } from '@/lib/logger';
export function ThirdShiftAI() {
  const { checkFeatureAccess } = usePlanRestrictions();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'checking'>('connected');
  const [showPaywall, setShowPaywall] = useState(false);

  if (!checkFeatureAccess('ai_assistant')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">AI Assistant Access Required</h2>
          <p className="text-muted-foreground mb-6">
            ThirdShift AI assistant with advanced regulatory analysis requires an Enterprise plan.
          </p>
          <Button onClick={() => setShowPaywall(true)}>
            Upgrade to Enterprise
          </Button>
        </div>
        <FeaturePaywall
          feature="ai_assistant"
          context="ThirdShift AI assistant with advanced regulatory analysis requires an Enterprise plan."
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
        />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      // Call the ThirdShift AI service (placeholder implementation)
      // In real implementation, this would call your Supabase edge function
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      
      // Simulate error for now (until API is fixed)
      throw new Error('ThirdShift AI service is currently unavailable. Please try again later.');
      
    } catch (err: unknown) {
      logger.error('ThirdShift AI error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      // Simulate connection check
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnectionStatus('error'); // Still failing for now
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Service Unavailable';
      case 'checking':
        return 'Checking...';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">ThirdShift AI</h2>
            <p className="text-muted-foreground">AI-powered regulatory analysis and insights</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkConnection}
            disabled={connectionStatus === 'checking'}
          >
            <RefreshCw className={`h-4 w-4 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {connectionStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ThirdShift AI service is currently experiencing issues. We're working to resolve this. 
            Please try again later or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Ask ThirdShift AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about regulatory changes, compliance requirements, or trends..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading || connectionStatus === 'error'}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={loading || !query.trim() || connectionStatus === 'error'}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {response && (
            <Card>
              <CardContent className="pt-4">
                <div className="prose prose-sm max-w-none">
                  {response}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sample Queries */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Sample queries:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "What are the latest FDA drug recalls?",
                "Show me USDA compliance changes",
                "Analyze EPA environmental regulations"
              ].map((sample, index) => (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setQuery(sample)}
                >
                  {sample}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
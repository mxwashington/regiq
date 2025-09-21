import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, AlertTriangle, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { useAIAlertProcessor } from '@/hooks/useAIAlertProcessor';
import { format } from 'date-fns';

interface Alert {
  id: string;
  title: string;
  summary?: string;
  ai_summary?: string;
  content?: string;
  urgency_score?: number;
  category?: string;
  agency?: string;
  published_date?: string;
  source_url?: string;
  perplexity_processed?: boolean;
}

interface AIAlertCardProps {
  alert: Alert;
  onAskAI?: (alertId: string, alertTitle: string) => void;
}

export const AIAlertCard: React.FC<AIAlertCardProps> = ({ alert, onAskAI }) => {
  const { processing, processAlert } = useAIAlertProcessor();

  const getUrgencyColor = (score?: number) => {
    if (!score) return 'secondary';
    if (score >= 8) return 'destructive';
    if (score >= 6) return 'destructive';
    if (score >= 4) return 'default';
    return 'secondary';
  };

  const getUrgencyLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 8) return 'Critical';
    if (score >= 6) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  };

  const getUrgencyIcon = (score?: number) => {
    if (!score || score < 6) return <Clock className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  const handleProcessAI = async () => {
    await processAlert(alert.id);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {alert.title}
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            {alert.urgency_score && (
              <Badge variant={getUrgencyColor(alert.urgency_score)} className="text-xs">
                {getUrgencyIcon(alert.urgency_score)}
                {getUrgencyLabel(alert.urgency_score)} {alert.urgency_score}/10
              </Badge>
            )}
            {alert.agency && (
              <Badge variant="outline" className="text-xs">
                {alert.agency}
              </Badge>
            )}
          </div>
        </div>
        
        {alert.published_date && (
          <CardDescription className="text-xs">
            {format(new Date(alert.published_date), 'MMM d, yyyy')}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* AI Summary Section */}
        {alert.ai_summary ? (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                AI Summary
              </span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              {alert.ai_summary}
            </p>
          </div>
        ) : alert.perplexity_processed === false ? (
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  AI Processing Available
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleProcessAI}
                disabled={processing}
                className="text-xs"
              >
                {processing ? 'Processing...' : 'Generate Summary'}
              </Button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Get an AI-powered summary and urgency assessment
            </p>
          </div>
        ) : null}

        {/* Original Summary */}
        {alert.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {alert.summary}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {alert.source_url && (
            <Button
              size="sm"
              variant="outline"
              asChild
              className="text-xs"
            >
              <a 
                href={alert.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View Source
              </a>
            </Button>
          )}
          
          {onAskAI && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAskAI(alert.id, alert.title)}
              className="text-xs"
            >
              <Brain className="h-3 w-3 mr-1" />
              Ask AI
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ExternalLink, 
  Search, 
  Calendar, 
  Building2, 
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { searchForAlert, generateAlertSummary } from '@/lib/alert-search';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  title: string;
  description?: string;
  source: string;
  external_url?: string;
  published_date?: string;
  urgency?: 'low' | 'medium' | 'high';
  gpt_summary?: string;
}

interface EnhancedAlertCardProps {
  alert: Alert;
  onSummaryGenerated?: (alertId: string, summary: string) => void;
}

export const EnhancedAlertCard = ({ alert, onSummaryGenerated }: EnhancedAlertCardProps) => {
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency?: string) => {
    switch (urgency) {
      case 'high': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const handleSmartSearch = async () => {
    setIsSearching(true);
    try {
      await searchForAlert(alert.title, alert.source);
      toast({
        title: "Smart Search Launched",
        description: "AI-enhanced search opened in new tab",
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to launch smart search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (alert.gpt_summary) return; // Already has summary
    
    setIsGeneratingSummary(true);
    try {
      const summary = await generateAlertSummary(alert.description || alert.title);
      onSummaryGenerated?.(alert.id, summary);
      toast({
        title: "Summary Generated",
        description: "AI summary created successfully",
      });
    } catch (error) {
      toast({
        title: "Summary Failed",
        description: "Failed to generate AI summary",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {alert.title}
          </CardTitle>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {alert.urgency && (
              <Badge className={`text-xs ${getUrgencyColor(alert.urgency)} flex items-center gap-1`}>
                {getUrgencyIcon(alert.urgency)}
                {alert.urgency}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span className="font-medium">{alert.source}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(alert.published_date)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* GPT Summary or Description */}
        {alert.gpt_summary ? (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">AI Summary</span>
            </div>
            <p className="text-sm text-blue-900">{alert.gpt_summary}</p>
          </div>
        ) : alert.description ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {alert.description}
          </p>
        ) : null}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {alert.external_url && alert.external_url.trim() && alert.external_url.startsWith('http') ? (
            <Button variant="outline" size="sm" asChild>
              <a 
                href={alert.external_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Read Full Alert
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSmartSearch}
              disabled={isSearching}
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Smart Search
            </Button>
          )}

          {!alert.gpt_summary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="flex items-center gap-2"
            >
              {isGeneratingSummary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Summary
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSmartSearch}
            disabled={isSearching}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Find Source
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
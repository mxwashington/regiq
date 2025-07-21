import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, AlertTriangle, X, Share2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MobileSourceViewer } from './MobileSourceViewer';

interface SimpleAlert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
  dismissed_by?: string[];
}

interface SimpleAlertCardProps {
  alert: SimpleAlert;
  onDismissAlert?: (alertId: string) => void;
}

const SimpleAlertCard: React.FC<SimpleAlertCardProps> = ({ alert, onDismissAlert }) => {
  const { toast } = useToast();
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = async () => {
    const shareText = `${alert.title}\n\n${alert.summary}\n\nSource: ${alert.source}`;
    const shareUrl = alert.external_url || window.location.href;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: alert.title,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Copied to clipboard",
          description: "Alert details have been copied to your clipboard.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Unable to share this alert.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2">
              {alert.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(alert.published_date)}
              </span>
              <span>{alert.source}</span>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`shrink-0 ${getUrgencyColor(alert.urgency)} text-xs px-2 py-1`}
          >
            <span className="flex items-center gap-1">
              {getUrgencyIcon(alert.urgency)}
              {alert.urgency}
            </span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {alert.summary}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Real-time regulatory alert
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs sm:h-7 sm:px-2 min-w-[44px] flex items-center gap-1"
              onClick={handleShare}
            >
              <Share2 className="h-3 w-3" />
              <span className="sm:hidden">Share</span>
              <span className="hidden sm:inline">Share</span>
            </Button>
            {onDismissAlert && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs sm:h-7 sm:px-2 min-w-[44px] flex items-center gap-1"
                onClick={() => onDismissAlert(alert.id)}
              >
                <X className="h-3 w-3" />
                <span className="sm:hidden">Hide</span>
                <span className="hidden sm:inline">Dismiss</span>
              </Button>
            )}
            {/* Mobile: Enhanced source viewer */}
            <div className="sm:hidden">
              <MobileSourceViewer
                alert={alert}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs min-w-[44px] flex items-center gap-1"
                  >
                    <Info className="h-3 w-3" />
                    Details
                  </Button>
                }
              />
            </div>
            {/* Desktop: Direct source link */}
            {alert.external_url && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex h-7 px-2 text-xs items-center gap-1"
                onClick={() => {
                  // Decode HTML entities in the URL
                  const decodedUrl = alert.external_url
                    ?.replace(/&amp;/g, '&')
                    ?.replace(/&lt;/g, '<')
                    ?.replace(/&gt;/g, '>')
                    ?.replace(/&quot;/g, '"')
                    ?.replace(/&#39;/g, "'");
                  
                  if (decodedUrl) {
                    window.open(decodedUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <ExternalLink className="h-3 w-3" />
                View Source
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleAlertCard;
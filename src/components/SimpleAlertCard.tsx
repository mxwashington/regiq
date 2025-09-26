
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, AlertTriangle, X, Share2, Search, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { useIsMobile } from '@/hooks/use-mobile';
import { searchForAlert, isValidSourceUrl } from '@/lib/alert-search';

import { logger } from '@/lib/logger';

// Simple inline mobile hook to fix runtime error
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

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
  const isMobile = useIsMobile();
  
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('Share button clicked for alert:', alert.title);
    
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
      logger.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Unable to share this alert.",
        variant: "destructive"
      });
    }
  };

  const handleSearchForAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('Search button clicked for alert:', alert.title);
    
    try {
      await searchForAlert(alert.title, alert.source);
      toast({
        title: "Search Started",
        description: "Opening search results in new tab...",
      });
    } catch (error) {
      logger.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search for this alert.",
        variant: "destructive"
      });
    }
  };

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('External link clicked for alert:', alert.title);
    
    try {
      // Decode HTML entities in the URL
      const decodedUrl = alert.external_url
        ?.replace(/&amp;/g, '&')
        ?.replace(/&lt;/g, '<')
        ?.replace(/&gt;/g, '>')
        ?.replace(/&quot;/g, '"')
        ?.replace(/&#39;/g, "'");
      
      if (decodedUrl) {
        logger.info('Opening external link:', decodedUrl);
        window.open(decodedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      logger.error('Error opening external link:', error);
      toast({
        title: "Link Error",
        description: "Unable to open the source link.",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('Dismiss button clicked for alert:', alert.title);
    
    if (onDismissAlert) {
      onDismissAlert(alert.id);
    }
  };

  return (
    <Card className={`mobile-alert-card mobile-container-safe mobile-card-content hover:shadow-md transition-shadow ${isMobile ? 'mx-2 mb-3 p-4' : ''}`}>
      <CardHeader className={isMobile ? "pb-2 px-3 pt-3" : "pb-3"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold leading-tight line-clamp-2 mb-2 mobile-text-content alert-title break-words-mobile ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {alert.title}
            </h3>
            <div className={`flex items-center gap-2 text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>
              <span className="flex items-center gap-1">
                <Clock className={isMobile ? "h-2.5 w-2.5" : "h-3 w-3"} />
                {isMobile ? 
                  formatDate(alert.published_date).split(',')[0] : // Just date on mobile
                  formatDate(alert.published_date)
                }
              </span>
              <span className={isMobile ? 'text-xs truncate max-w-16' : ''}>{alert.source}</span>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`shrink-0 ${getUrgencyColor(alert.urgency)} ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
          >
            <span className="flex items-center gap-1">
              {getUrgencyIcon(alert.urgency)}
              {isMobile ? alert.urgency.charAt(0).toUpperCase() : alert.urgency}
            </span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "pt-0 px-3 pb-3" : "pt-0"}>
        <p className={`text-muted-foreground mb-3 mobile-text-content break-words-mobile ${isMobile ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
          {alert.summary}
        </p>

        {/* Actions - Mobile Optimized */}
        <div className={`flex items-center ${isMobile ? 'justify-end' : 'justify-between'}`}>
          {!isMobile && (
            <div className="text-xs text-muted-foreground">
              Real-time regulatory alert
            </div>
          )}
          <div className={`flex items-center ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
            <Button
              onClick={handleShare}
              className="flex items-center gap-1"
            >
              <Share2 className="h-3 w-3" />
              <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Share</span>
            </Button>
            
            {onDismissAlert && (
              <Button
                onClick={handleDismiss}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Hide</span>
              </Button>
            )}
            
            {isValidSourceUrl(alert.external_url) ? (
              <>
                <Button
                  onClick={handleExternalLink}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Source</span>
                </Button>
                <Button
                  onClick={handleSearchForAlert}
                  className="flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Search</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSearchForAlert}
                className="flex items-center gap-1"
              >
                <Search className="h-3 w-3" />
                <span className={isMobile ? 'inline' : 'hidden sm:inline'}>Find</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleAlertCard;

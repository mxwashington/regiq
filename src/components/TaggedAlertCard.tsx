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

interface AlertTag {
  id: string;
  tag: {
    id: string;
    name: string;
    slug: string;
    color: string;
    category: {
      name: string;
    };
  };
  confidence_score: number;
  is_primary: boolean;
}

interface Alert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
  alert_tags?: AlertTag[];
  dismissed_by?: string[];
}

interface TaggedAlertCardProps {
  alert: Alert;
  onTagClick?: (categoryName: string, tagId: string, tagName: string) => void;
  onDismissAlert?: (alertId: string) => void;
}

const TaggedAlertCard: React.FC<TaggedAlertCardProps> = ({ alert, onTagClick, onDismissAlert }) => {
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

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('External link clicked for alert:', alert.title);
    
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
  };

  const handleSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('Search button clicked for alert:', alert.title);
    searchForAlert(alert.title, alert.source);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.info('Dismiss button clicked for alert:', alert.title);
    
    if (onDismissAlert) {
      onDismissAlert(alert.id);
    }
  };

  // Group tags by category for better display
  const tagsByCategory = alert.alert_tags?.reduce((acc, alertTag) => {
    const categoryName = alertTag.tag.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(alertTag);
    return acc;
  }, {} as Record<string, AlertTag[]>) || {};

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

        {/* Tags by Category */}
        {Object.keys(tagsByCategory).length > 0 && (
          <div className="space-y-2 mb-4">
            {Object.entries(tagsByCategory).map(([categoryName, tags]) => (
              <div key={categoryName} className="flex flex-wrap gap-1">
                {tags.map((alertTag) => (
                  <Button
                    key={alertTag.id}
                    variant="ghost"
                    className="h-6 px-2 text-xs hover:shadow-sm transition-all"
                    style={{
                      backgroundColor: `${alertTag.tag.color}15`,
                      borderColor: `${alertTag.tag.color}40`,
                      color: alertTag.tag.color,
                      border: '1px solid'
                    }}
                    onClick={() => onTagClick?.(categoryName, alertTag.tag.id, alertTag.tag.name)}
                  >
                    <span className="flex items-center gap-1">
                      {alertTag.tag.name}
                      {alertTag.confidence_score < 0.8 && (
                        <span className="text-xs opacity-60">
                          ({Math.round(alertTag.confidence_score * 100)}%)
                        </span>
                      )}
                    </span>
                  </Button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Actions - Mobile Optimized */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {alert.alert_tags?.length || 0} tags
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleShare}>
              <Share2 className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            {onDismissAlert && (
              <Button onClick={handleDismiss}>
                <X className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Dismiss</span>
              </Button>
            )}
            {isValidSourceUrl(alert.external_url) ? (
              <>
                <Button onClick={handleExternalLink}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">View Source</span>
                </Button>
                <Button onClick={handleSearch}>
                  <Globe className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleSearch}>
                <Search className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Find Source</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaggedAlertCard;

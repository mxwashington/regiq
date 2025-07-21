import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, BookmarkX, Share2, Bookmark } from 'lucide-react';
import { useSimpleAlerts } from '@/hooks/useSimpleAlerts';

interface SavedItemsProps {
  savedAlerts: any[];
  onUnsaveAlert: (alertId: string) => void;
}

export function SavedItems({ savedAlerts, onUnsaveAlert }: SavedItemsProps) {
  const { alerts } = useSimpleAlerts();
  
  // Get full alert data for saved items
  const savedAlertData = useMemo(() => {
    const savedIds = savedAlerts.map(item => item.id);
    return alerts.filter(alert => savedIds.includes(alert.id));
  }, [alerts, savedAlerts]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const shareAlert = async (alert: any) => {
    try {
      const shareData = {
        title: `Saved Regulatory Alert: ${alert.title}`,
        text: alert.summary,
        url: alert.external_url || window.location.href
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const urlToCopy = alert.external_url || window.location.href;
        await navigator.clipboard.writeText(urlToCopy);
      }
    } catch (error) {
      console.warn('Share failed:', error);
    }
  };

  if (savedAlerts.length === 0) {
    return (
      <div className="text-center py-12">
        <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No saved items yet</h3>
        <p className="text-muted-foreground">
          Save alerts you want to revisit later by clicking the bookmark icon
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Items</h2>
          <p className="text-muted-foreground">
            {savedAlerts.length} saved alert{savedAlerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Badge variant="secondary">{savedAlerts.length}</Badge>
      </div>

      <div className="space-y-4">
        {savedAlertData.map((alert) => (
          <Card key={alert.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {alert.source}
                    </Badge>
                    <Badge 
                      variant={alert.urgency.toLowerCase() === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {alert.urgency}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(alert.published_date)}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold leading-tight">
                    {alert.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {alert.summary}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                {alert.external_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={alert.external_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Source
                    </a>
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onUnsaveAlert(alert.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <BookmarkX className="h-3 w-3 mr-1" />
                  Remove
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => shareAlert(alert)}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
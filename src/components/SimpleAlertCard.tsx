import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, AlertTriangle, X } from 'lucide-react';

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
            {onDismissAlert && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onDismissAlert(alert.id)}
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </Button>
            )}
            {alert.external_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
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
                <ExternalLink className="h-3 w-3 mr-1" />
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
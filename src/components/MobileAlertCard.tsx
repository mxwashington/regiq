import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ExternalLink, Calendar, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  title: string;
  summary: string;
  agency: string;
  urgency: 'high' | 'medium' | 'low' | 'info';
  date: string;
  source_url?: string;
  category?: string;
}

interface MobileAlertCardProps {
  alert: Alert;
  onFindSource?: (alert: Alert) => void;
  className?: string;
}

const urgencyConfig = {
  high: {
    icon: AlertTriangle,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    label: 'High Priority'
  },
  medium: {
    icon: AlertTriangle,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    label: 'Medium Priority'
  },
  low: {
    icon: Info,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    label: 'Low Priority'
  },
  info: {
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    label: 'Information'
  }
};

const agencyColors = {
  FDA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  USDA: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  EPA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  EMA: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
};

export const MobileAlertCard: React.FC<MobileAlertCardProps> = ({
  alert,
  onFindSource,
  className
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isMobile, addTouchFeedback } = useMobileOptimization({
    enableTouchFeedback: true
  });

  const urgency = urgencyConfig[alert.urgency] || urgencyConfig.info;
  const UrgencyIcon = urgency.icon;
  const agencyColorClass = agencyColors[alert.agency as keyof typeof agencyColors] || agencyColors.default;

  // Add touch feedback to the card
  useEffect(() => {
    if (cardRef.current && isMobile) {
      return addTouchFeedback(cardRef.current);
    }
  }, [addTouchFeedback, isMobile]);

  const formatMobileDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const handleFindSource = () => {
    if (onFindSource) {
      onFindSource(alert);
    } else if (alert.source_url && alert.source_url.trim() && alert.source_url.startsWith('http')) {
      window.open(alert.source_url, '_blank', 'noopener,noreferrer');
    } else {
      // Could add a toast here for invalid URLs if needed
      console.warn('Invalid or missing source URL for alert:', alert.title);
    }
  };

  return (
    <Card 
      ref={cardRef}
      className={cn(
        'mobile-alert-card mobile-container-safe mobile-card-content transition-all duration-200 ease-out',
        'border border-border/50 shadow-sm hover:shadow-md',
        'active:scale-[0.98] active:shadow-sm',
        isMobile && 'mx-2 mb-3 rounded-lg p-4',
        className
      )}
    >
      <CardHeader className="pb-3 space-y-3">
        {/* Agency and Urgency Badges */}
        <div className="flex items-center justify-between gap-2">
          <Badge 
            variant="secondary" 
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-md',
              agencyColorClass
            )}
          >
            {alert.agency}
          </Badge>
          
          <Badge 
            variant="outline"
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1',
              urgency.className
            )}
          >
            <UrgencyIcon className="h-3 w-3" />
            {isMobile ? alert.urgency.toUpperCase() : urgency.label}
          </Badge>
        </div>

        {/* Title */}
        <h3 className={cn(
          'font-semibold leading-tight text-foreground mobile-text-content alert-title',
          isMobile ? 'text-base line-clamp-3' : 'text-lg line-clamp-2'
        )}>
          {alert.title}
        </h3>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Summary */}
        <p className={cn(
          'text-muted-foreground leading-relaxed mobile-text-content break-words-mobile',
          isMobile ? 'text-sm line-clamp-4' : 'text-base line-clamp-3'
        )}>
          {alert.summary}
        </p>

        {/* Category if available */}
        {alert.category && (
          <Badge variant="outline" className="text-xs">
            {alert.category}
          </Badge>
        )}

        {/* Actions and Metadata */}
        <div className="space-y-3">
          {/* Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatMobileDate(alert.date)}</span>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleFindSource}
            className={cn(
              'w-full gap-2 touch-manipulation',
              isMobile ? 'h-12 text-sm font-medium' : 'h-10'
            )}
            disabled={!alert.source_url && !onFindSource}
          >
            <ExternalLink className="h-4 w-4" />
            Find Source
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Add mobile-specific CSS classes
const mobileAlertCardStyles = `
  .mobile-alert-card {
    /* Ensure minimum touch target size */
    min-height: 44px;
    
    /* Optimize for mobile tapping */
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    
    /* Smooth transitions for mobile interactions */
    transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  }
  
  .mobile-alert-card:active {
    transform: scale(0.98);
  }
  
  /* Text clamp utilities for mobile */
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .line-clamp-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* Mobile-specific responsive adjustments */
  @media (max-width: 768px) {
    .mobile-alert-card {
      margin-bottom: 12px;
      border-radius: 12px;
      padding: 16px;
    }
    
    .mobile-alert-card button {
      font-size: 14px;
      padding: 12px 16px;
      border-radius: 8px;
    }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('mobile-alert-card-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'mobile-alert-card-styles';
  styleSheet.textContent = mobileAlertCardStyles;
  document.head.appendChild(styleSheet);
}
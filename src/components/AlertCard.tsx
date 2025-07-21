import React from 'react';
import { ExternalLink, Share, Eye } from 'lucide-react';

interface Alert {
  id: number;
  title: string;
  source: string;
  urgency: string;
  published_date: string;
  summary: string;
  external_url?: string;
  tags?: string[];
}

interface AlertCardProps {
  alert: Alert;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewSource = () => {
    if (alert.external_url) {
      window.open(alert.external_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async () => {
    const shareText = `${alert.title}\n\nSource: ${alert.source}`;
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
        window.alert('Alert details copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 mr-3">
          <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2">
            {alert.title}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getUrgencyColor(alert.urgency)}`}>
              {alert.urgency.toUpperCase()}
            </span>
            <span className="text-sm text-gray-600">{alert.source}</span>
          </div>
          <div className="text-sm text-gray-500 mb-2">
            {formatDate(alert.published_date)}
          </div>
        </div>
      </div>

      {/* Summary */}
      {alert.summary && (
        <div className="text-sm text-gray-700 mb-4 leading-relaxed">
          {alert.summary}
        </div>
      )}

      {/* Tags */}
      {alert.tags && alert.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {alert.tags.map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Mobile-optimized View Source Button */}
          {alert.external_url && (
            <button
              onClick={handleViewSource}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">View Source</span>
              <span className="sm:hidden">Source</span>
            </button>
          )}
          
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Share className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Mark as Read/Unread */}
        <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors">
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Mark Read</span>
        </button>
      </div>
    </div>
  );
};

export default AlertCard;
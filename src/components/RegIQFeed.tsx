import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSimpleAlerts } from "@/hooks/useSimpleAlerts";
import { useAlertFilters } from "@/hooks/useAlertFilters";
import {
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Share2,
  Brain,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle,
  Bookmark,
  Globe
} from "lucide-react";
import { ThirdShiftStatusIndicator } from "./ThirdShiftStatusIndicator";
import { searchForAlert, isValidSourceUrl } from "@/lib/alert-search";

import { logger } from '@/lib/logger';

interface RegIQAlert {
  id: string;
  title: string;
  source: string;
  agency?: string; // Add agency field to match database
  published_date: string;
  summary: string;
  urgency: string;
  external_url?: string;
  full_content?: string;
  industry: string;
  signal_type: string;
  tags: string[];
}

interface RegIQFeedProps {
  onSaveAlert?: (alertId: string) => void;
  savedAlerts?: any[];
}

// Convert database alert format to RegIQ format
const convertToRegIQAlert = (alert: any): RegIQAlert => {
  let industry = "Food Safety"; // default
  let signalType = "Market Signal"; // default
  let tags: string[] = [];

  // Try to parse full_content for additional data
  if (alert.full_content) {
    try {
      const content = JSON.parse(alert.full_content);
      industry = content.industry || detectIndustry(alert.title, alert.summary);
      signalType = content.signal_type || detectSignalType(alert.title, alert.summary);
      tags = content.tags || generateTags(alert.title, alert.summary);
    } catch {
      industry = detectIndustry(alert.title, alert.summary);
      signalType = detectSignalType(alert.title, alert.summary);
      tags = generateTags(alert.title, alert.summary);
    }
  } else {
    industry = detectIndustry(alert.title, alert.summary);
    signalType = detectSignalType(alert.title, alert.summary);
    tags = generateTags(alert.title, alert.summary);
  }

  return {
    id: alert.id,
    title: alert.title,
    source: alert.source,
    agency: alert.agency, // Include agency field from database
    published_date: alert.published_date,
    summary: alert.summary,
    urgency: alert.urgency,
    external_url: alert.external_url,
    full_content: alert.full_content,
    industry,
    signal_type: signalType,
    tags
  };
};

// Helper functions
const detectIndustry = (title: string, summary: string): string => {
  const text = (title + ' ' + summary).toLowerCase();
  
  if (text.includes('drug') || text.includes('pharmaceutical') || text.includes('medicine') || text.includes('therapy')) {
    return 'Pharmaceuticals';
  }
  if (text.includes('agriculture') || text.includes('crop') || text.includes('farm') || text.includes('pesticide')) {
    return 'Agriculture';
  }
  if (text.includes('animal') || text.includes('veterinary') || text.includes('pet') || text.includes('livestock')) {
    return 'Animal Health';
  }
  return 'Food Safety'; // default
};

const detectSignalType = (title: string, summary: string): string => {
  const text = (title + ' ' + summary).toLowerCase();
  
  if (text.includes('recall') || text.includes('withdrawn')) return 'Recall';
  if (text.includes('warning letter') || text.includes('warning to')) return 'Warning Letter';
  if (text.includes('guidance') || text.includes('draft guidance') || text.includes('final guidance')) return 'Guidance';
  if (text.includes('rule') || text.includes('regulation') || text.includes('cfr') || text.includes('federal register')) return 'Rule Change';
  return 'Market Signal'; // default
};

const generateTags = (title: string, summary: string): string[] => {
  const text = (title + ' ' + summary).toLowerCase();
  const tags = [];
  
  if (text.includes('inspection')) tags.push('Inspection');
  if (text.includes('compliance')) tags.push('Compliance');
  if (text.includes('safety')) tags.push('Safety');
  if (text.includes('contamination')) tags.push('Contamination');
  if (text.includes('labeling')) tags.push('Labeling');
  if (text.includes('import')) tags.push('Import Alert');
  if (text.includes('clinical')) tags.push('Clinical');
  if (text.includes('outbreak')) tags.push('Outbreak');
  
  return tags.slice(0, 3); // Limit to 3 tags
};

const getAgencyColor = (agency: string) => {
  const agencyUpper = agency.toUpperCase();
  if (agencyUpper.includes('FDA')) return "bg-blue-100 text-blue-800 border-blue-200";
  if (agencyUpper.includes('USDA') || agencyUpper.includes('FSIS')) return "bg-green-100 text-green-800 border-green-200";
  if (agencyUpper.includes('EPA')) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (agencyUpper.includes('CDC')) return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high': return "bg-red-100 text-red-800 border-red-200";
    case 'medium': return "bg-orange-100 text-orange-800 border-orange-200";
    case 'low': return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default: return "bg-blue-100 text-blue-800 border-blue-200";
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high': return <AlertTriangle className="h-4 w-4" />;
    case 'medium': return <TrendingUp className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
  }
};

const getSignalTypeColor = (signalType: string) => {
  switch (signalType) {
    case 'Recall': return "bg-red-100 text-red-800 border-red-200";
    case 'Warning Letter': return "bg-orange-100 text-orange-800 border-orange-200";
    case 'Rule Change': return "bg-purple-100 text-purple-800 border-purple-200";
    case 'Guidance': return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 0) {
    // Handle future dates (might be timezone issues)
    return "Just published";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else if (diffInMinutes < 10080) { // 7 days
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

const getAlertFreshness = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return { level: 'new', label: 'NEW', color: 'bg-green-500 text-white' };
  } else if (diffInMinutes < 720) { // 12 hours
    return { level: 'recent', label: 'RECENT', color: 'bg-blue-500 text-white' };
  } else if (diffInMinutes < 1440) { // 24 hours
    return { level: 'today', label: 'TODAY', color: 'bg-orange-500 text-white' };
  }
  return null;
};

const isAlertNew = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  return diffInHours < 1; // Consider alerts less than 1 hour old as "new"
};


export function RegIQFeed({ onSaveAlert, savedAlerts = [] }: RegIQFeedProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  // Use alert filters hook for filtering
  const { filters: alertFilters } = useAlertFilters();

  // Fetch alerts data with filters (filtering is done at the hook level)
  const { alerts: fetchedAlerts, loading } = useSimpleAlerts(50, alertFilters);

  // Convert to RegIQ format - filtering is already handled by useAlertFilters
  const alerts = useMemo(() => {
    const converted = (fetchedAlerts || []).map(convertToRegIQAlert);
    logger.info('[RegIQFeed] Converted alerts:', {
      fetchedCount: fetchedAlerts?.length || 0,
      convertedCount: converted.length,
      loading,
      sampleConverted: converted[0]
    });
    return converted;
  }, [fetchedAlerts, loading]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const markAsRead = (itemId: string) => {
    const newReadItems = new Set(readItems);
    newReadItems.add(itemId);
    setReadItems(newReadItems);
  };

  const shareAlert = async (alert: RegIQAlert) => {
    try {
      const shareData = {
        title: `RegIQ Alert: ${alert.title}`,
        text: alert.summary,
        url: alert.external_url || window.location.href
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy URL to clipboard
        const urlToCopy = alert.external_url || window.location.href;
        await navigator.clipboard.writeText(urlToCopy);
        // Note: Removed toast dependency to avoid errors
      }
    } catch (error) {
      // Silent failure
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading RegIQ feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RegIQ Feed</h1>
          <p className="text-muted-foreground">
            {alerts.length} regulatory updates • Real-time intelligence
          </p>
        </div>
        <ThirdShiftStatusIndicator />
      </div>


      {/* Feed */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {alertFilters.searchQuery
                    ? "No alerts match your search criteria. Try adjusting your filters or search terms."
                    : "No alerts match your current filters. Try expanding your date range or including more sources."
                  }
                </p>
              </div>
            </div>
          </Card>
        ) : (
          alerts.map((alert) => {
          const isExpanded = expandedItems.has(alert.id);
          const isRead = readItems.has(alert.id);
          const freshness = getAlertFreshness(alert.published_date);
          const isNew = isAlertNew(alert.published_date);

          return (
            <Card
              key={alert.id}
              className={`overflow-hidden hover:shadow-md transition-all duration-200 ${
                isRead ? 'opacity-75' : ''
              } ${
                isNew ? 'ring-2 ring-green-200 shadow-lg' : ''
              }`}
            >
              <Collapsible>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Freshness Badge - Show first if present */}
                        {freshness && (
                          <Badge className={`text-xs font-medium ${freshness.color} animate-pulse`}>
                            {freshness.label}
                          </Badge>
                        )}

                        <Badge className={`text-xs border ${getAgencyColor(alert.source)}`}>
                          {alert.source}
                        </Badge>

                        <Badge className={`text-xs border ${getPriorityColor(alert.urgency)}`}>
                          {getPriorityIcon(alert.urgency)}
                          <span className="ml-1">{alert.urgency}</span>
                        </Badge>

                        <Badge className={`text-xs border ${getSignalTypeColor(alert.signal_type)}`}>
                          {alert.signal_type}
                        </Badge>

                        <Badge variant="outline" className="text-xs">
                          {alert.industry}
                        </Badge>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(alert.published_date)}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold leading-tight hover:text-primary transition-colors cursor-pointer">
                        {alert.title}
                      </h3>

                      {/* Summary */}
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {alert.summary}
                        </p>
                      </div>

                      {/* Tags */}
                      {alert.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {alert.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleExpanded(alert.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Source link section with search fallback */}
                      {alert.external_url && alert.external_url.trim() && alert.external_url.startsWith('http') ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            onClick={() => markAsRead(alert.id)}
                          >
                            <a 
                              href={alert.external_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                              onClick={(e) => {
                                logger.info('Clicking external URL:', alert.external_url);
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Read Full Alert
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => searchForAlert(alert.title, alert.source)}
                            className="flex items-center gap-2"
                          >
                            <Globe className="h-3 w-3" />
                            Search Web
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            searchForAlert(alert.title, alert.source);
                            markAsRead(alert.id);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Search className="h-3 w-3" />
                          Find Source
                        </Button>
                      )}
                      
                      {onSaveAlert && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onSaveAlert(alert.id)}
                          className={savedAlerts?.some(item => item.id === alert.id) ? 'text-blue-600' : ''}
                        >
                          <Bookmark className={`h-3 w-3 mr-1 ${savedAlerts?.some(item => item.id === alert.id) ? 'fill-current' : ''}`} />
                          {savedAlerts?.some(item => item.id === alert.id) ? 'Saved' : 'Save'}
                        </Button>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => shareAlert(alert)}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                        disabled={isRead}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {isRead ? 'Read' : 'Mark Read'}
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
          })
        )}
      </div>
    </div>
  );
}
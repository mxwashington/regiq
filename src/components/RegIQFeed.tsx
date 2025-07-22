import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSimpleAlerts } from "@/hooks/useSimpleAlerts";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Filter,
  X,
  CheckCircle,
  Bookmark,
  Search,
  Globe
} from "lucide-react";
import { RegIQMobileFilters } from "./RegIQMobileFilters";
import { RegIQDesktopFilters } from "./RegIQDesktopFilters";
import { ThirdShiftStatusIndicator } from "./ThirdShiftStatusIndicator";
import { searchForAlert, isValidSourceUrl } from "@/lib/alert-search";

interface RegIQAlert {
  id: string;
  title: string;
  source: string;
  published_date: string;
  summary: string;
  urgency: string;
  external_url?: string;
  full_content?: string;
  industry: string;
  signal_type: string;
  tags: string[];
}

interface RegIQFilters {
  timePeriod: string;
  agencies: string[];
  industries: string[];
  priorities: string[];
  signalTypes: string[];
}

const defaultFilters: RegIQFilters = {
  timePeriod: "Last 30 days",
  agencies: [],
  industries: [],
  priorities: [],
  signalTypes: []
};

interface RegIQFeedProps {
  initialFilters?: {
    timePeriod?: string;
    priorities?: string[];
    agencies?: string[];
    showSavedOnly?: boolean;
  };
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
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else if (diffInMinutes < 10080) { // 7 days
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const filterByTimePeriod = (alerts: RegIQAlert[], timePeriod: string): RegIQAlert[] => {
  if (timePeriod === "All time") return alerts;
  
  const now = new Date();
  let cutoffDate = new Date();
  
  switch (timePeriod) {
    case "Last 24 hours":
      cutoffDate.setHours(now.getHours() - 24);
      break;
    case "Last 7 days":
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case "Last 30 days":
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case "Last 90 days":
      cutoffDate.setDate(now.getDate() - 90);
      break;
    default:
      return alerts;
  }
  
  return alerts.filter(alert => new Date(alert.published_date) >= cutoffDate);
};

export function RegIQFeed({ initialFilters, onSaveAlert, savedAlerts = [] }: RegIQFeedProps = {}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [readItems, setReadItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<RegIQFilters>({
    ...defaultFilters,
    timePeriod: initialFilters?.timePeriod || defaultFilters.timePeriod,
    priorities: initialFilters?.priorities || [],
    agencies: initialFilters?.agencies || []
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Fetch alerts data without limit
  const { alerts: fetchedAlerts, loading } = useSimpleAlerts();

  // Convert to RegIQ format
  const alerts = useMemo(() => {
    const converted = (fetchedAlerts || []).map(convertToRegIQAlert);
    console.log('[RegIQFeed] Converted alerts:', {
      fetchedCount: fetchedAlerts?.length || 0,
      convertedCount: converted.length,
      loading,
      sampleConverted: converted[0]
    });
    return converted;
  }, [fetchedAlerts, loading]);

  // Apply filters
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    console.log('[RegIQFeed] Starting filter process:', {
      totalAlerts: alerts.length,
      filters,
      sampleAlert: alerts[0]
    });

    // Time period filter
    filtered = filterByTimePeriod(filtered, filters.timePeriod);
    console.log('[RegIQFeed] After time filter:', filtered.length);

    // Agency filter
    if (filters.agencies.length > 0) {
      filtered = filtered.filter(alert => {
        const source = alert.source.toLowerCase();
        return filters.agencies.some(agency => {
          const agencyLower = agency.toLowerCase();
          return source.includes(agencyLower) || 
                 (agency === 'FDA' && source.includes('food and drug')) ||
                 (agency === 'USDA' && (source.includes('agriculture') || source.includes('fsis'))) ||
                 (agency === 'EPA' && source.includes('environmental')) ||
                 (agency === 'CDC' && source.includes('disease control'));
        });
      });
      console.log('[RegIQFeed] After agency filter:', filtered.length);
    }

    // Industry filter
    if (filters.industries.length > 0) {
      filtered = filtered.filter(alert => filters.industries.includes(alert.industry));
      console.log('[RegIQFeed] After industry filter:', filtered.length);
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(alert => filters.priorities.includes(alert.urgency));
      console.log('[RegIQFeed] After priority filter:', filtered.length);
    }

    // Signal type filter
    if (filters.signalTypes.length > 0) {
      filtered = filtered.filter(alert => filters.signalTypes.includes(alert.signal_type));
      console.log('[RegIQFeed] After signal type filter:', filtered.length);
    }

    console.log('[RegIQFeed] Final filtered alerts:', {
      count: filtered.length,
      sampleTitles: filtered.slice(0, 3).map(a => a.title)
    });

    return filtered;
  }, [alerts, filters]);

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

  const clearAllFilters = () => {
    setFilters(defaultFilters);
  };

  const getActiveFilterCount = () => {
    return filters.agencies.length + 
           filters.industries.length + 
           filters.priorities.length + 
           filters.signalTypes.length +
           (filters.timePeriod !== "Last 30 days" ? 1 : 0);
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
            {filteredAlerts.length} regulatory updates • Real-time intelligence
          </p>
        </div>
        <ThirdShiftStatusIndicator />
      </div>

      {/* Filters */}
      {isMobile ? (
        <>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setMobileFiltersOpen(true)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
              >
                Clear All
              </Button>
            )}
          </div>
          <RegIQMobileFilters
            isOpen={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </>
      ) : (
        <RegIQDesktopFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearAll={clearAllFilters}
        />
      )}

      {/* Feed */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => {
          const isExpanded = expandedItems.has(alert.id);
          const isRead = readItems.has(alert.id);

          return (
            <Card 
              key={alert.id} 
              className={`overflow-hidden hover:shadow-md transition-shadow ${
                isRead ? 'opacity-75' : ''
              }`}
            >
              <Collapsible>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap">
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
                      <h3 className={`text-lg font-semibold leading-tight hover:text-primary transition-colors cursor-pointer ${
                        isMobile ? 'text-base' : ''
                      }`}>
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
                      {isValidSourceUrl(alert.external_url) ? (
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
                                console.log('Clicking external URL:', alert.external_url);
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
        })}

        {filteredAlerts.length === 0 && (
          <Card className="p-8 text-center">
            <div className="space-y-3">
              <h4 className="font-medium text-lg">No regulatory updates found</h4>
              <p className="text-muted-foreground">
                Try adjusting your filters to see more results. Our AI is continuously monitoring for new updates.
              </p>
              <Button 
                variant="outline" 
                onClick={clearAllFilters}
                className="mt-4"
              >
                Clear All Filters
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
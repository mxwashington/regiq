import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useSimpleAlerts } from "@/hooks/useSimpleAlerts";
import MobileFilterPanel from "@/components/MobileFilterPanel";
import { 
  Calendar, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Bookmark,
  Share2,
  Brain,
  TrendingUp,
  AlertTriangle,
  Info,
  Target,
  Filter
} from "lucide-react";

interface RegulatoryItem {
  id: string;
  title: string;
  source: string;
  published_date: string;
  summary: string;
  urgency: string;
  external_url?: string;
  full_content?: string;
}

interface RegulatoryFeedProps {
  searchQuery: string;
  selectedFilters: {
    agencies: string[];
    industries: string[];
    urgency: string[];
    signalTypes: string[];
    dateRange: string;
  };
}

// Convert database alert format to display format
const convertAlertToRegulatoryItem = (alert: any): RegulatoryItem => {
  return {
    id: alert.id,
    title: alert.title,
    source: alert.source,
    published_date: alert.published_date,
    summary: alert.summary,
    urgency: alert.urgency,
    external_url: alert.external_url,
    full_content: alert.full_content
  };
};

const getAgencyColor = (agency: string) => {
  const colors: { [key: string]: string } = {
    "FDA": "agency-fda",
    "USDA": "agency-usda", 
    "EPA": "agency-epa",
    "CDC": "agency-cdc"
  };
  return colors[agency] || "muted";
};

export function RegulatoryFeed({ searchQuery, selectedFilters }: RegulatoryFeedProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { toast } = useToast();

  // Use the same data source as AlertsDashboard for consistency
  const { alerts: fetchedAlerts, loading } = useSimpleAlerts(50);

  // Convert to RegulatoryItem format
  const alerts = useMemo(() => {
    return (fetchedAlerts || []).map(convertAlertToRegulatoryItem);
  }, [fetchedAlerts]);


  const filteredData = useMemo(() => {
    let filtered = alerts;

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query)
      );
    }

    // Apply agency filter - check if source contains any of the selected agencies
    if (selectedFilters.agencies.length > 0) {
      filtered = filtered.filter(item => {
        const itemSource = item.source.toLowerCase();
        return selectedFilters.agencies.some(agency => {
          const agencyName = agency.toLowerCase();
          // Check both exact match and contains for flexibility
          return itemSource.includes(agencyName) || 
                 itemSource.includes(agencyName.toUpperCase()) ||
                 (agency === 'usda' && (itemSource.includes('department of agriculture') || itemSource.includes('fsis'))) ||
                 (agency === 'fda' && (itemSource.includes('food and drug'))) ||
                 (agency === 'epa' && (itemSource.includes('environmental protection'))) ||
                 (agency === 'cdc' && (itemSource.includes('centers for disease') || itemSource.includes('disease control')));
        });
      });
    }

    // Apply urgency filter
    if (selectedFilters.urgency.length > 0) {
      filtered = filtered.filter(item => 
        selectedFilters.urgency.includes(item.urgency)
      );
    }

    // Apply signal type filter
    if (selectedFilters.signalTypes.length > 0) {
      filtered = filtered.filter(item => {
        // Extract signal type from full_content or detect from title/summary
        let itemSignalType = 'Market Signal'; // default
        
        try {
          const fullContent = JSON.parse(item.full_content || '{}');
          itemSignalType = fullContent.signal_type || detectSignalType(item.title, item.summary);
        } catch {
          itemSignalType = detectSignalType(item.title, item.summary);
        }
        
        return selectedFilters.signalTypes.includes(itemSignalType);
      });
    }

    return filtered;
  }, [alerts, searchQuery, selectedFilters]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const toggleBookmark = (itemId: string) => {
    const newBookmarked = new Set(bookmarkedItems);
    if (newBookmarked.has(itemId)) {
      newBookmarked.delete(itemId);
    } else {
      newBookmarked.add(itemId);
    }
    setBookmarkedItems(newBookmarked);
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return "bg-red-100 text-red-800 border-red-200";
      case 'medium': return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Helper function to detect signal type from text
  const detectSignalType = (title: string, description: string): string => {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('recall') || text.includes('withdrawn')) return 'Recall';
    if (text.includes('warning letter') || text.includes('warning to')) return 'Warning Letter';
    if (text.includes('guidance') || text.includes('draft guidance') || text.includes('final guidance')) return 'Guidance';
    if (text.includes('rule') || text.includes('regulation') || text.includes('cfr') || text.includes('federal register')) return 'Rule Change';
    if (text.includes('alert') || text.includes('safety communication') || text.includes('advisory')) return 'Market Signal';
    
    return 'Market Signal'; // default
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading regulatory feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regulatory Intelligence Feed</h3>
          <p className="text-sm text-muted-foreground">
            {filteredData.length} regulatory updates • Real-time monitoring
          </p>
        </div>
        
        {/* Mobile Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMobileFilters(true)}
          className="lg:hidden flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="space-y-3">
        {filteredData.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const isBookmarked = bookmarkedItems.has(item.id);

          return (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <Collapsible>
                <CardHeader 
                  className="pb-3 cursor-pointer"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getAgencyColor(item.source)}`}
                        >
                          {item.source}
                        </Badge>
                        
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getUrgencyColor(item.urgency)}`}>
                          {getUrgencyIcon(item.urgency)}
                          <span>{item.urgency} Priority</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.published_date)}
                        </div>
                      </div>

                      <h4 className="font-semibold text-base leading-tight hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(item.id);
                        }}
                        className={isBookmarked ? "text-yellow-600" : ""}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const shareData = {
                              title: `RegIQ Alert: ${item.title}`,
                              text: item.summary || 'Regulatory alert from RegIQ',
                              url: item.external_url || window.location.href
                            };

                            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                              await navigator.share(shareData);
                            } else {
                              // Fallback: Copy URL to clipboard
                              const urlToCopy = item.external_url || window.location.href;
                              await navigator.clipboard.writeText(urlToCopy);
                              toast({
                                title: "Link copied to clipboard",
                                description: "You can now paste and share this alert.",
                              });
                            }
                          } catch (error) {
                            if (error.name !== 'AbortError') {
                              // Fallback: Copy URL to clipboard
                              try {
                                const urlToCopy = item.external_url || window.location.href;
                                await navigator.clipboard.writeText(urlToCopy);
                                toast({
                                  title: "Link copied to clipboard",
                                  description: "You can now paste and share this alert.",
                                });
                              } catch (clipboardError) {
                                toast({
                                  title: "Unable to share",
                                  description: "Sharing is not supported on this device.",
                                  variant: "destructive",
                                });
                              }
                            }
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>

                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(item.id);
                          }}
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

                  <div className="mt-3">
                    <div className="flex items-start gap-2">
                      <Brain className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {item.summary}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pt-2">
                        {item.external_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={item.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Source
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {filteredData.length === 0 && (
          <Card className="p-8 text-center">
            <div className="space-y-2">
              <h4 className="font-medium">No regulatory updates found</h4>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria or filters to see more results.
              </p>
            </div>
          </Card>
        )}
      </div>
      
      {/* Mobile Filter Panel */}
      <MobileFilterPanel 
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        filters={{
          sources: ["FDA", "EU Commission", "ISO", "Health Canada", "TGA", "PMDA", "USDA", "EPA", "CDC"],
          urgency: ["high", "medium", "low"],
          tags: ["Medical Devices", "FDA", "Guidance", "EU MDR", "Regulation", "ISO", "Quality Management", "Standards"],
          dateRange: ["Last 24 hours", "Last 7 days", "Last 30 days", "Custom"]
        }}
        onFilterChange={() => {}} // This would need to be connected to parent component filter state
        activeFilters={{
          sources: selectedFilters.agencies,
          urgency: selectedFilters.urgency,
          tags: [],
          dateRange: selectedFilters.dateRange
        }}
      />
    </div>
  );
}
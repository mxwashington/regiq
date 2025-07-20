import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Target
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
  const [alerts, setAlerts] = useState<RegulatoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch alerts from database
  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('published_date', { ascending: false })
        .limit(50); // Limit to recent alerts

      if (error) throw error;

      const convertedAlerts = (data || []).map(convertAlertToRegulatoryItem);
      setAlerts(convertedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error loading regulatory feed",
        description: "Failed to load regulatory updates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      </div>

      <div className="space-y-3">
        {filteredData.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const isBookmarked = bookmarkedItems.has(item.id);

          return (
            <Card key={item.id} className="overflow-hidden">
              <Collapsible>
                <CardHeader className="pb-3">
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

                      <h4 className="font-semibold text-base leading-tight">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBookmark(item.id)}
                        className={isBookmarked ? "text-yellow-600" : ""}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>

                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>

                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleExpanded(item.id)}
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
    </div>
  );
}
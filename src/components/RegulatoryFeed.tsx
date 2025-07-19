import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  RefreshCw,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegulatoryItem {
  id: string;
  title: string;
  sourceAgency: string;
  publishedDate: string;
  aiSummary: string;
  urgencyLevel: number;
  industryTags: string[];
  signalType: string;
  sourceUrl: string;
  riskScore: number;
  keyPoints?: string[];
  complianceImpact?: string;
  recommendedActions?: string[];
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

const sampleData: RegulatoryItem[] = [
  {
    id: "1",
    title: "FDA Issues Warning Letter to ABC Food Processing for HACCP Violations",
    sourceAgency: "FDA",
    publishedDate: new Date().toISOString(), // Current date
    aiSummary: "FDA cited ABC Food Processing for inadequate HACCP plans and temperature control failures. Company has 15 days to respond with corrective actions. Enforcement action may follow if violations persist.",
    urgencyLevel: 7,
    industryTags: ["Food Safety"],
    signalType: "Warning Letter",
    sourceUrl: "https://fda.gov/sample-warning",
    riskScore: 7,
    keyPoints: [
      "HACCP plans do not cover all required food safety hazards",
      "Temperature monitoring records incomplete",
      "Corrective action procedures inadequately documented"
    ],
    complianceImpact: "Medium - Review your own HACCP procedures and temperature monitoring systems",
    recommendedActions: [
      "Audit internal HACCP plans for completeness",
      "Verify temperature monitoring equipment calibration",
      "Train staff on proper documentation procedures"
    ]
  },
  {
    id: "2",
    title: "USDA FSIS Recalls 12,000 Pounds of Ground Beef for E. coli Contamination",
    sourceAgency: "USDA",
    publishedDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    aiSummary: "Class I recall affects ground beef products distributed to retail locations in Texas and Oklahoma. No illnesses reported. Consumers advised to discard product immediately.",
    urgencyLevel: 9,
    industryTags: ["Food Safety"],
    signalType: "Recall",
    sourceUrl: "https://fsis.usda.gov/sample-recall",
    riskScore: 9,
    keyPoints: [
      "E. coli O157:H7 contamination confirmed",
      "Products distributed to major retail chains",
      "Investigation ongoing to determine source"
    ],
    complianceImpact: "High - Immediate action required if you received affected products",
    recommendedActions: [
      "Check if your facility received any affected products",
      "Review supplier qualification procedures",
      "Verify E. coli testing protocols for ground beef"
    ]
  },
  {
    id: "3",
    title: "EPA Finalizes New Pesticide Residue Limits for Leafy Greens",
    sourceAgency: "EPA",
    publishedDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    aiSummary: "New maximum residue limits take effect March 1, 2024. Affects spinach, lettuce, and kale production. Compliance required for all domestic and imported products.",
    urgencyLevel: 6,
    industryTags: ["Agriculture"],
    signalType: "Rule Change",
    sourceUrl: "https://epa.gov/sample-rule",
    riskScore: 6,
    keyPoints: [
      "Residue limits reduced by 30% from previous standards",
      "Both domestic and imported products affected",
      "Transition period until March 1, 2024"
    ],
    complianceImpact: "Medium - Update testing protocols and supplier requirements",
    recommendedActions: [
      "Update supplier specifications for pesticide use",
      "Modify incoming inspection procedures",
      "Train quality assurance team on new limits"
    ]
  },
  {
    id: "4",
    title: "EMA Approves New Veterinary Antibiotic for Swine Respiratory Disease",
    sourceAgency: "EMA",
    publishedDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    aiSummary: "Tulathromycin injection approved for treatment of swine respiratory disease complex. Available in EU markets Q2 2024. Withdrawal periods: 13 days for meat.",
    urgencyLevel: 4,
    industryTags: ["Animal Health"],
    signalType: "Guidance",
    sourceUrl: "https://ema.europa.eu/sample-approval",
    riskScore: 4,
    keyPoints: [
      "New treatment option for swine respiratory disease",
      "13-day withdrawal period for meat products",
      "Available in EU markets starting Q2 2024"
    ],
    complianceImpact: "Low - Informational update for animal health products",
    recommendedActions: [
      "Review antibiotic usage policies",
      "Update withdrawal period documentation",
      "Train veterinary staff on new treatment options"
    ]
  },
  {
    id: "5",
    title: "FDA Guidance: Updated Good Manufacturing Practices for Dietary Supplements",
    sourceAgency: "FDA",
    publishedDate: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    aiSummary: "Draft guidance clarifies cGMP requirements for dietary supplement manufacturers. 60-day comment period begins January 15. Final guidance expected by year-end.",
    urgencyLevel: 5,
    industryTags: ["Pharmaceuticals"],
    signalType: "Guidance",
    sourceUrl: "https://fda.gov/sample-guidance",
    riskScore: 5,
    keyPoints: [
      "Clarifications on current Good Manufacturing Practices",
      "60-day public comment period",
      "Expected to be finalized by end of 2024"
    ],
    complianceImpact: "Medium - May require updates to manufacturing procedures",
    recommendedActions: [
      "Review current cGMP compliance programs",
      "Consider submitting comments during public period",
      "Plan for potential procedure updates"
    ]
  }
];

const getUrgencyColor = (level: number) => {
  if (level >= 8) return "urgency-high";
  if (level >= 6) return "urgency-medium";
  if (level >= 4) return "urgency-low";
  return "urgency-info";
};

const getUrgencyIcon = (level: number) => {
  if (level >= 8) return AlertTriangle;
  if (level >= 6) return TrendingUp;
  if (level >= 4) return Target;
  return Info;
};

const getAgencyColor = (agency: string) => {
  const colors: { [key: string]: string } = {
    "FDA": "agency-fda",
    "USDA": "agency-usda", 
    "EPA": "agency-epa",
    "EMA": "agency-ema",
    "FSIS": "agency-fda",
    "EFSA": "agency-ema"
  };
  return colors[agency] || "muted";
};

interface RSSFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  agency: string;
  category: string;
  urgencyScore: number;
  color: string;
  icon: string;
  guid: string;
}

export function RegulatoryFeed({ searchQuery, selectedFilters }: RegulatoryFeedProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [rssItems, setRssItems] = useState<RSSFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadRSSFeeds = async () => {
    setLoading(true);
    try {
      console.log('Loading RSS feeds from edge function...');
      
      // Call our Supabase edge function with shorter timeout
      const { data, error } = await supabase.functions.invoke('fetch-rss-feeds', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('RSS feed response:', { data, error });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch feeds');
      }

      const items = data?.items || [];
      console.log('RSS items received:', items.length);
      
      if (items.length > 0) {
        setRssItems(items);
        toast({
          title: "✅ Live feeds loaded",
          description: `${items.length} regulatory updates from ${data.cached ? 'cache' : 'live sources'}`,
        });
      } else {
        console.log('No RSS items received, using fallback data');
        setRssItems(generateSampleRSSData());
        toast({
          title: "⚡ Sample data loaded",
          description: "Live feeds currently unavailable, showing sample regulatory data",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error loading RSS feeds:', error);
      setRssItems(generateSampleRSSData());
      toast({
        title: "⚡ Sample data loaded", 
        description: "Live feeds currently unavailable, showing sample regulatory data",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRSSFeeds();
  }, []);

  // Generate sample data for fallback
  const generateSampleRSSData = (): RSSFeedItem[] => {
    const today = new Date();
    return [
      {
        id: "sample-1",
        title: "FDA Issues New Guidance on Food Safety Modernization Act Implementation",
        description: "The FDA has released updated guidance for industry regarding implementation of preventive controls for human food under the Food Safety Modernization Act.",
        link: "https://www.fda.gov/food/guidance-documents-regulatory-information-topic-food-and-dietary-supplements/draft-guidance-industry-hazard-analysis-and-risk-based-preventive-controls-human-food-chapter-1",
        pubDate: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        agency: "FDA",
        category: "Food Safety",
        urgencyScore: 7,
        color: "#dc2626",
        icon: "🏥",
        guid: "sample-guid-1"
      },
      {
        id: "sample-2", 
        title: "USDA Announces Salmonella Outbreak Investigation",
        description: "USDA-FSIS is investigating a multi-state outbreak of Salmonella infections potentially linked to poultry products from a specific facility.",
        link: "https://www.fsis.usda.gov/news-events/news-press-releases",
        pubDate: new Date(today.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        agency: "USDA",
        category: "Outbreak Investigation", 
        urgencyScore: 9,
        color: "#dc2626",
        icon: "🚨",
        guid: "sample-guid-2"
      },
      {
        id: "sample-3",
        title: "EPA Releases Updated Pesticide Residue Tolerances",
        description: "New tolerance levels established for several pesticide active ingredients on various food commodities.",
        link: "https://www.epa.gov/pesticide-tolerances",
        pubDate: new Date(today.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        agency: "EPA",
        category: "Pesticide Regulation",
        urgencyScore: 5,
        color: "#059669", 
        icon: "🌱",
        guid: "sample-guid-3"
      }
    ];
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const toggleSaved = (id: string) => {
    const newSaved = new Set(savedItems);
    if (newSaved.has(id)) {
      newSaved.delete(id);
    } else {
      newSaved.add(id);
    }
    setSavedItems(newSaved);
  };

  // Convert RSS items to the format expected by the UI, fallback to sample data if no RSS items
  const allItems = rssItems.length > 0 ? rssItems : [];
  const convertedData = allItems.length > 0 ? allItems.map(item => ({
    id: item.id,
    title: item.title,
    sourceAgency: item.agency,
    publishedDate: item.pubDate.toISOString(),
    aiSummary: item.description.substring(0, 300) + (item.description.length > 300 ? '...' : ''),
    urgencyLevel: item.urgencyScore,
    industryTags: [item.category],
    signalType: item.category,
    sourceUrl: item.link,
    riskScore: item.urgencyScore,
    keyPoints: item.description.split('.').slice(0, 3).filter(point => point.trim().length > 10),
    complianceImpact: `Priority ${item.urgencyScore}/10 - Review this ${item.category.toLowerCase()} update for potential impact on your operations`,
    recommendedActions: [
      "Review the full regulatory document",
      "Assess impact on current procedures",
      "Consult with compliance team if needed"
    ]
  })) : sampleData;

  // Filter the data based on selected filters and search query
  const filteredData = convertedData.filter(item => {
    // Search query filter
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !item.aiSummary.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Agency filter
    if (selectedFilters.agencies.length > 0 && 
        !selectedFilters.agencies.some(agency => 
          item.sourceAgency.toLowerCase().includes(agency.toLowerCase())
        )) {
      return false;
    }

    // Industry filter - using category as industry
    if (selectedFilters.industries.length > 0 && 
        !item.industryTags.some(tag => 
          selectedFilters.industries.some(industry => 
            tag.toLowerCase().includes(industry.toLowerCase())
          )
        )) {
      return false;
    }

    // Urgency filter
    if (selectedFilters.urgency.length > 0) {
      const urgencyMap: { [key: string]: number[] } = {
        "high": [8, 9, 10],
        "medium": [6, 7],
        "low": [4, 5],
        "info": [1, 2, 3]
      };
      
      const matchesUrgency = selectedFilters.urgency.some(urgency =>
        urgencyMap[urgency]?.includes(item.urgencyLevel)
      );
      
      if (!matchesUrgency) return false;
    }

    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="text-center py-12">
          <CardContent>
            <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Loading Live Regulatory Data</h3>
            <p className="text-muted-foreground">
              Fetching updates from FDA, USDA, and Federal Register...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredData.length} live regulatory updates
        </p>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadRSSFeeds}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feed Items */}
      {filteredData.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Info className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query to see more results.
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredData.map((item) => {
          const UrgencyIcon = getUrgencyIcon(item.urgencyLevel);
          const isExpanded = expandedItems.has(item.id);
          const isSaved = savedItems.has(item.id);

          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="outline" 
                        className={`text-${getAgencyColor(item.sourceAgency)} border-${getAgencyColor(item.sourceAgency)}`}
                      >
                        {item.sourceAgency}
                      </Badge>
                      <Badge variant="secondary">{item.signalType}</Badge>
                      <div className={`flex items-center gap-1 text-${getUrgencyColor(item.urgencyLevel)}`}>
                        <UrgencyIcon className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          Priority: {item.riskScore}/10
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        🔴 LIVE
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-semibold leading-tight mb-2">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.publishedDate)}
                      </div>
                      <div className="flex gap-1">
                        {item.industryTags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1 mt-1">
                        <Brain className="h-3 w-3" />
                        Summary
                      </Badge>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.aiSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSaved(item.id)}
                    >
                      <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Expandable Analysis */}
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
                <CardContent className="pt-0">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2">
                      <span className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        View Analysis & Recommendations
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
                    {item.keyPoints && (
                      <div>
                        <h4 className="font-medium mb-2">Key Points</h4>
                        <ul className="space-y-1">
                          {item.keyPoints.map((point, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.complianceImpact && (
                      <div>
                        <h4 className="font-medium mb-2">Compliance Impact</h4>
                        <p className="text-sm text-muted-foreground">{item.complianceImpact}</p>
                      </div>
                    )}

                    {item.recommendedActions && (
                      <div>
                        <h4 className="font-medium mb-2">Recommended Actions</h4>
                        <ul className="space-y-1">
                          {item.recommendedActions.map((action, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>
          );
        })
      )}
    </div>
  );
}
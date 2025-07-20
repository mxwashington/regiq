import { useState, useMemo } from "react";
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
  Target
} from "lucide-react";

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

// Static regulatory data for demonstration
const generateStaticRegulatoryData = (): RegulatoryItem[] => {
  const today = new Date();
  return [
    {
      id: "reg-1",
      title: "FDA Issues New Guidance on Food Safety Modernization Act Implementation",
      sourceAgency: "FDA",
      publishedDate: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      aiSummary: "The FDA has released updated guidance for industry regarding implementation of preventive controls for human food under the Food Safety Modernization Act.",
      urgencyLevel: 7,
      industryTags: ["Food Safety"],
      signalType: "Guidance",
      sourceUrl: "https://www.fda.gov/food/guidance-documents-regulatory-information-topic-food-and-dietary-supplements",
      riskScore: 7,
      keyPoints: [
        "Updated requirements for preventive controls",
        "New documentation standards for food facilities",
        "Enhanced supplier verification requirements"
      ],
      complianceImpact: "Priority 7/10 - Review this guidance update for potential impact on your operations",
      recommendedActions: [
        "Review the full regulatory document",
        "Assess current compliance status",
        "Update internal procedures if needed",
        "Consult with regulatory affairs team"
      ]
    },
    {
      id: "reg-2",
      title: "USDA Announces Salmonella Outbreak Investigation",
      sourceAgency: "USDA",
      publishedDate: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      aiSummary: "USDA-FSIS is investigating a multi-state outbreak of Salmonella infections potentially linked to poultry products from a specific facility.",
      urgencyLevel: 9,
      industryTags: ["Food Safety", "Poultry"],
      signalType: "Outbreak Investigation",
      sourceUrl: "https://www.fsis.usda.gov/news-events/news-press-releases",
      riskScore: 9,
      keyPoints: [
        "Multi-state Salmonella outbreak investigation underway",
        "Potential link to specific poultry facility identified",
        "Public health officials advising increased vigilance"
      ],
      complianceImpact: "Priority 9/10 - High priority outbreak requiring immediate attention",
      recommendedActions: [
        "Review supplier relationships for affected products",
        "Enhance testing protocols for similar products",
        "Monitor CDC and USDA updates closely",
        "Prepare contingency plans for potential recalls"
      ]
    },
    {
      id: "reg-3",
      title: "EPA Releases Updated Pesticide Residue Tolerances",
      sourceAgency: "EPA",
      publishedDate: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      aiSummary: "New tolerance levels established for several pesticide active ingredients on various food commodities.",
      urgencyLevel: 5,
      industryTags: ["Agriculture", "Pesticides"],
      signalType: "Regulation Update",
      sourceUrl: "https://www.epa.gov/pesticide-tolerances",
      riskScore: 5,
      keyPoints: [
        "Updated maximum residue limits for key pesticides",
        "New testing requirements for specific commodities",
        "Compliance timeline extends through next growing season"
      ],
      complianceImpact: "Priority 5/10 - Monitor for potential impact on agricultural operations",
      recommendedActions: [
        "Review pesticide usage in supply chain",
        "Update testing protocols if applicable",
        "Coordinate with agricultural suppliers",
        "Monitor for additional EPA announcements"
      ]
    },
    {
      id: "reg-4",
      title: "CDC Issues Health Alert for Listeria in Ready-to-Eat Products",
      sourceAgency: "CDC",
      publishedDate: new Date(today.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      aiSummary: "CDC has issued a health alert regarding potential Listeria contamination in ready-to-eat food products from multiple manufacturers.",
      urgencyLevel: 8,
      industryTags: ["Food Safety", "Ready-to-Eat"],
      signalType: "Health Alert",
      sourceUrl: "https://www.cdc.gov/listeria/outbreaks",
      riskScore: 8,
      keyPoints: [
        "Listeria monocytogenes detected in ready-to-eat products",
        "Multiple manufacturers potentially affected",
        "Enhanced surveillance measures implemented"
      ],
      complianceImpact: "Priority 8/10 - Immediate review of ready-to-eat product safety protocols required",
      recommendedActions: [
        "Audit ready-to-eat product suppliers",
        "Review Listeria prevention controls",
        "Enhance environmental monitoring",
        "Prepare for potential product holds"
      ]
    }
  ];
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

  const staticData = generateStaticRegulatoryData();

  const filteredData = useMemo(() => {
    let filtered = staticData;

    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.aiSummary.toLowerCase().includes(query) ||
        item.sourceAgency.toLowerCase().includes(query) ||
        item.industryTags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply agency filter
    if (selectedFilters.agencies.length > 0) {
      filtered = filtered.filter(item => 
        selectedFilters.agencies.includes(item.sourceAgency)
      );
    }

    // Apply industry filter
    if (selectedFilters.industries.length > 0) {
      filtered = filtered.filter(item =>
        item.industryTags.some(tag => selectedFilters.industries.includes(tag))
      );
    }

    // Apply urgency filter
    if (selectedFilters.urgency.length > 0) {
      filtered = filtered.filter(item => {
        const urgencyCategory = item.urgencyLevel >= 8 ? 'High' : 
                               item.urgencyLevel >= 6 ? 'Medium' : 'Low';
        return selectedFilters.urgency.includes(urgencyCategory);
      });
    }

    // Apply signal type filter
    if (selectedFilters.signalTypes.length > 0) {
      filtered = filtered.filter(item =>
        selectedFilters.signalTypes.includes(item.signalType)
      );
    }

    return filtered;
  }, [staticData, searchQuery, selectedFilters]);

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

  const getUrgencyIcon = (level: number) => {
    if (level >= 8) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (level >= 6) return <TrendingUp className="h-4 w-4 text-orange-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getUrgencyColor = (level: number) => {
    if (level >= 8) return "bg-red-100 text-red-800 border-red-200";
    if (level >= 6) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
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
                          className={`text-xs ${getAgencyColor(item.sourceAgency)}`}
                        >
                          {item.sourceAgency}
                        </Badge>
                        
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getUrgencyColor(item.urgencyLevel)}`}>
                          {getUrgencyIcon(item.urgencyLevel)}
                          <span>Priority {item.urgencyLevel}/10</span>
                        </div>

                        <Badge variant="secondary" className="text-xs">
                          {item.signalType}
                        </Badge>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.publishedDate)}
                        </div>
                      </div>

                      <h4 className="font-semibold text-base leading-tight">
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-2 flex-wrap">
                        {item.industryTags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
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
                        {item.aiSummary}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {item.keyPoints && (
                        <div>
                          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            Key Points
                          </h5>
                          <ul className="space-y-1">
                            {item.keyPoints.map((point, index) => (
                              <li key={index} className="text-sm text-muted-foreground pl-4 relative">
                                <span className="absolute left-0 top-2 w-1 h-1 bg-muted-foreground rounded-full"></span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.complianceImpact && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Compliance Impact</h5>
                          <p className="text-sm text-muted-foreground">{item.complianceImpact}</p>
                        </div>
                      )}

                      {item.recommendedActions && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Recommended Actions</h5>
                          <ul className="space-y-1">
                            {item.recommendedActions.map((action, index) => (
                              <li key={index} className="text-sm text-muted-foreground pl-4 relative">
                                <span className="absolute left-0 top-2 w-1 h-1 bg-muted-foreground rounded-full"></span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Source
                          </a>
                        </Button>
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
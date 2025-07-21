import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, ChevronDown, ChevronRight } from "lucide-react";

interface RegIQFilters {
  timePeriod: string;
  agencies: string[];
  industries: string[];
  priorities: string[];
  signalTypes: string[];
}

interface RegIQMobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: RegIQFilters;
  onFiltersChange: (filters: RegIQFilters) => void;
}

const TIME_PERIODS = [
  "Last 24 hours",
  "Last 7 days", 
  "Last 30 days",
  "Last 90 days",
  "All time"
];

const AGENCIES = [
  "FDA",
  "USDA", 
  "EPA",
  "FSIS",
  "CDC",
  "OSHA",
  "FTC",
  "EMA",
  "EFSA",
  "Health Canada"
];

const INDUSTRIES = [
  "Food Safety",
  "Pharmaceuticals",
  "Agriculture", 
  "Animal Health"
];

const PRIORITIES = [
  "High",
  "Medium",
  "Low",
  "Informational"
];

const SIGNAL_TYPES = [
  "Recall",
  "Rule Change",
  "Guidance",
  "Warning Letter",
  "Market Signal"
];

export function RegIQMobileFilters({ 
  isOpen, 
  onClose, 
  filters, 
  onFiltersChange 
}: RegIQMobileFiltersProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['time']));

  const toggleSection = (section: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(section)) {
      newOpenSections.delete(section);
    } else {
      newOpenSections.add(section);
    }
    setOpenSections(newOpenSections);
  };

  const updateTimePeriod = (value: string) => {
    onFiltersChange({ ...filters, timePeriod: value });
  };

  const updateCheckboxFilter = (
    filterKey: keyof RegIQFilters, 
    value: string, 
    checked: boolean
  ) => {
    const currentValues = filters[filterKey] as string[];
    let newValues;
    
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    onFiltersChange({ ...filters, [filterKey]: newValues });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      timePeriod: "Last 30 days",
      agencies: [],
      industries: [],
      priorities: [],
      signalTypes: []
    });
  };

  const applyFilters = () => {
    onClose();
  };

  const getActiveFiltersCount = () => {
    return filters.agencies.length + 
           filters.industries.length + 
           filters.priorities.length + 
           filters.signalTypes.length +
           (filters.timePeriod !== "Last 30 days" ? 1 : 0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Filter Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-50 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-4">
          {/* Time Period */}
          <Collapsible 
            open={openSections.has('time')} 
            onOpenChange={() => toggleSection('time')}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-0 h-auto font-medium"
              >
                <span>Time Period</span>
                {openSections.has('time') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <RadioGroup 
                value={filters.timePeriod} 
                onValueChange={updateTimePeriod}
                className="space-y-2"
              >
                {TIME_PERIODS.map((period) => (
                  <div key={period} className="flex items-center space-x-2">
                    <RadioGroupItem value={period} id={`time-${period}`} />
                    <Label htmlFor={`time-${period}`} className="text-sm">
                      {period}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CollapsibleContent>
          </Collapsible>

          {/* Source Agencies */}
          <Collapsible 
            open={openSections.has('agencies')} 
            onOpenChange={() => toggleSection('agencies')}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-0 h-auto font-medium"
              >
                <span>Source Agencies</span>
                {openSections.has('agencies') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {AGENCIES.map((agency) => (
                  <div key={agency} className="flex items-center space-x-2">
                    <Checkbox
                      id={`agency-${agency}`}
                      checked={filters.agencies.includes(agency)}
                      onCheckedChange={(checked) => 
                        updateCheckboxFilter('agencies', agency, !!checked)
                      }
                    />
                    <Label htmlFor={`agency-${agency}`} className="text-sm">
                      {agency}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Industries */}
          <Collapsible 
            open={openSections.has('industries')} 
            onOpenChange={() => toggleSection('industries')}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-0 h-auto font-medium"
              >
                <span>Industries</span>
                {openSections.has('industries') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {INDUSTRIES.map((industry) => (
                  <div key={industry} className="flex items-center space-x-2">
                    <Checkbox
                      id={`industry-${industry}`}
                      checked={filters.industries.includes(industry)}
                      onCheckedChange={(checked) => 
                        updateCheckboxFilter('industries', industry, !!checked)
                      }
                    />
                    <Label htmlFor={`industry-${industry}`} className="text-sm">
                      {industry}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Priority Level */}
          <Collapsible 
            open={openSections.has('priorities')} 
            onOpenChange={() => toggleSection('priorities')}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-0 h-auto font-medium"
              >
                <span>Priority Level</span>
                {openSections.has('priorities') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {PRIORITIES.map((priority) => (
                  <div key={priority} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={filters.priorities.includes(priority)}
                      onCheckedChange={(checked) => 
                        updateCheckboxFilter('priorities', priority, !!checked)
                      }
                    />
                    <Label htmlFor={`priority-${priority}`} className="text-sm">
                      {priority} Priority
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Signal Type */}
          <Collapsible 
            open={openSections.has('signals')} 
            onOpenChange={() => toggleSection('signals')}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-0 h-auto font-medium"
              >
                <span>Signal Type</span>
                {openSections.has('signals') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {SIGNAL_TYPES.map((signalType) => (
                  <div key={signalType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`signal-${signalType}`}
                      checked={filters.signalTypes.includes(signalType)}
                      onCheckedChange={(checked) => 
                        updateCheckboxFilter('signalTypes', signalType, !!checked)
                      }
                    />
                    <Label htmlFor={`signal-${signalType}`} className="text-sm">
                      {signalType}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t p-4 space-y-3">
          <div className="text-sm text-muted-foreground text-center">
            {getActiveFiltersCount()} active filter{getActiveFiltersCount() !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
            <Button 
              className="flex-1"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
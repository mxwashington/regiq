import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import { AVAILABLE_AGENCIES, getAgencyDisplayName } from "@/lib/agencies";

interface RegIQFilters {
  timePeriod: string;
  agencies: string[];
  industries: string[];
  priorities: string[];
  signalTypes: string[];
}

interface RegIQDesktopFiltersProps {
  filters: RegIQFilters;
  onFiltersChange: (filters: RegIQFilters) => void;
  onClearAll: () => void;
}

const TIME_PERIODS = [
  "Last 24 hours",
  "Last 7 days", 
  "Last 30 days",
  "Last 90 days",
  "All time"
];

// Remove the hardcoded AGENCIES array since we're importing it

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

export function RegIQDesktopFilters({ 
  filters, 
  onFiltersChange, 
  onClearAll 
}: RegIQDesktopFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

  const removeFilter = (filterKey: keyof RegIQFilters, value: string) => {
    const currentValues = filters[filterKey] as string[];
    const newValues = currentValues.filter(v => v !== value);
    onFiltersChange({ ...filters, [filterKey]: newValues });
  };

  const getActiveFiltersCount = () => {
    return filters.agencies.length + 
           filters.industries.length + 
           filters.priorities.length + 
           filters.signalTypes.length +
           (filters.timePeriod !== "Last 30 days" ? 1 : 0);
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="grid grid-cols-5 gap-4">
        {/* Time Period */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Time Period</Label>
          <Popover 
            open={openDropdown === 'time'} 
            onOpenChange={(open) => setOpenDropdown(open ? 'time' : null)}
          >
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
              >
                <span className="truncate">{filters.timePeriod}</span>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <RadioGroup 
                value={filters.timePeriod} 
                onValueChange={(value) => {
                  updateTimePeriod(value);
                  setOpenDropdown(null);
                }}
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
            </PopoverContent>
          </Popover>
        </div>

        {/* Agencies */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Source Agencies</Label>
          <Popover 
            open={openDropdown === 'agencies'} 
            onOpenChange={(open) => setOpenDropdown(open ? 'agencies' : null)}
          >
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
              >
                <span className="truncate">
                  {filters.agencies.length === 0 
                    ? "All agencies" 
                    : `${filters.agencies.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {AVAILABLE_AGENCIES.map((agency) => (
                  <div key={agency} className="flex items-center space-x-2">
                    <Checkbox
                      id={`agency-${agency}`}
                      checked={filters.agencies.includes(agency)}
                      onCheckedChange={(checked) => 
                        updateCheckboxFilter('agencies', agency, !!checked)
                      }
                    />
                    <Label htmlFor={`agency-${agency}`} className="text-sm">
                      {getAgencyDisplayName(agency)}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Industries */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Industries</Label>
          <Popover 
            open={openDropdown === 'industries'} 
            onOpenChange={(open) => setOpenDropdown(open ? 'industries' : null)}
          >
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
              >
                <span className="truncate">
                  {filters.industries.length === 0 
                    ? "All industries" 
                    : `${filters.industries.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
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
            </PopoverContent>
          </Popover>
        </div>

        {/* Priorities */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Priority Level</Label>
          <Popover 
            open={openDropdown === 'priorities'} 
            onOpenChange={(open) => setOpenDropdown(open ? 'priorities' : null)}
          >
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
              >
                <span className="truncate">
                  {filters.priorities.length === 0 
                    ? "All priorities" 
                    : `${filters.priorities.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
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
                      {priority}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Signal Types */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Signal Type</Label>
          <Popover 
            open={openDropdown === 'signals'} 
            onOpenChange={(open) => setOpenDropdown(open ? 'signals' : null)}
          >
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
              >
                <span className="truncate">
                  {filters.signalTypes.length === 0 
                    ? "All signals" 
                    : `${filters.signalTypes.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
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
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Active Filters</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearAll}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Time Period Filter Tag */}
            {filters.timePeriod !== "Last 30 days" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">Time: {filters.timePeriod}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                  onClick={() => updateTimePeriod("Last 30 days")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {/* Agency Filter Tags */}
            {filters.agencies.map((agency) => (
              <Badge key={agency} variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">
                  {getAgencyDisplayName(agency)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                  onClick={() => removeFilter('agencies', agency)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {/* Industry Filter Tags */}
            {filters.industries.map((industry) => (
              <Badge key={industry} variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">{industry}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                  onClick={() => removeFilter('industries', industry)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {/* Priority Filter Tags */}
            {filters.priorities.map((priority) => (
              <Badge key={priority} variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">{priority}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                  onClick={() => removeFilter('priorities', priority)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {/* Signal Type Filter Tags */}
            {filters.signalTypes.map((signalType) => (
              <Badge key={signalType} variant="secondary" className="flex items-center gap-1">
                <span className="text-xs">{signalType}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                  onClick={() => removeFilter('signalTypes', signalType)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
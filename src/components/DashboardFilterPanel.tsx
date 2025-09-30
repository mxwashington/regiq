import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { AlertFilters, AgencySource } from "@/hooks/useAlertFilters";

interface DashboardFilterPanelProps {
  filters: AlertFilters;
  onSourceToggle: (source: AgencySource) => void;
  onSinceDaysChange: (days: number) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

const AGENCY_SOURCES: { value: AgencySource; label: string }[] = [
  { value: 'FDA', label: 'FDA' },
  { value: 'EPA', label: 'EPA' },
  { value: 'USDA', label: 'USDA' },
  { value: 'FSIS', label: 'FSIS' },
  { value: 'Federal_Register', label: 'Federal Register' },
  { value: 'CDC', label: 'CDC' },
  { value: 'REGULATIONS_GOV', label: 'Regulations.gov' },
  { value: 'USDA-ARMS', label: 'USDA ARMS' },
  { value: 'USDA-FDC', label: 'USDA FoodData' },
];

const DATE_RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last year' },
];

export function DashboardFilterPanel({
  filters,
  onSourceToggle,
  onSinceDaysChange,
  onSearchChange,
  onReset,
}: DashboardFilterPanelProps) {
  const activeFiltersCount = filters.sources.length < 9 ? filters.sources.length : 0;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={filters.searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {filters.searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Time Period</Label>
          <Select
            value={filters.sinceDays.toString()}
            onValueChange={(value) => onSinceDaysChange(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value.toString()}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Agencies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Source Agencies</Label>
            {filters.sources.length > 0 && filters.sources.length < 9 && (
              <span className="text-xs text-muted-foreground">
                {filters.sources.length} selected
              </span>
            )}
          </div>
          <div className="space-y-2">
            {AGENCY_SOURCES.map((source) => (
              <div key={source.value} className="flex items-center space-x-2">
                <Checkbox
                  id={source.value}
                  checked={filters.sources.includes(source.value)}
                  onCheckedChange={() => onSourceToggle(source.value)}
                />
                <Label
                  htmlFor={source.value}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {source.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

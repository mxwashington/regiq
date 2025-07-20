import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface FilterSidebarProps {
  selectedFilters: {
    agencies: string[];
    industries: string[];
    urgency: string[];
    signalTypes: string[];
    dateRange: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearAll: () => void;
}

const agencies = [
  { id: "fda", name: "FDA", color: "agency-fda" },
  { id: "usda", name: "USDA", color: "agency-usda" },
  { id: "epa", name: "EPA", color: "agency-epa" },
  { id: "fsis", name: "FSIS", color: "agency-fda" },
  { id: "cdc", name: "CDC", color: "agency-cdc" },
  { id: "osha", name: "OSHA", color: "agency-osha" },
  { id: "ftc", name: "FTC", color: "agency-ftc" },
  { id: "ema", name: "EMA", color: "agency-ema" },
  { id: "efsa", name: "EFSA", color: "agency-ema" },
  { id: "canada_health", name: "Health Canada", color: "agency-canada" }
];

const industries = [
  "Food Safety",
  "Pharmaceuticals", 
  "Agriculture",
  "Animal Health"
];

const urgencyLevels = [
  { id: "high", name: "High Priority", color: "urgency-high" },
  { id: "medium", name: "Medium Priority", color: "urgency-medium" },
  { id: "low", name: "Low Priority", color: "urgency-low" },
  { id: "info", name: "Informational", color: "urgency-info" }
];

const signalTypes = [
  "Recall",
  "Rule Change",
  "Guidance",
  "Warning Letter",
  "Market Signal"
];

export function FilterSidebar({ selectedFilters, onFilterChange, onClearAll }: FilterSidebarProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Clear All
        </Button>
      </div>

      {/* Date Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Time Period</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedFilters.dateRange} onValueChange={(value) => onFilterChange('dateRange', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24hours">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Agencies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Source Agencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {agencies.map((agency) => (
            <div key={agency.id} className="flex items-center space-x-2">
              <Checkbox
                id={agency.id}
                checked={selectedFilters.agencies.includes(agency.id)}
                onCheckedChange={() => onFilterChange('agencies', agency.id)}
              />
              <Label htmlFor={agency.id} className="flex items-center space-x-2 text-sm font-normal cursor-pointer">
                <Badge variant="outline" className={`text-${agency.color} border-${agency.color}`}>
                  {agency.name}
                </Badge>
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Industries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Industries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {industries.map((industry) => (
            <div key={industry} className="flex items-center space-x-2">
              <Checkbox
                id={industry}
                checked={selectedFilters.industries.includes(industry)}
                onCheckedChange={() => onFilterChange('industries', industry)}
              />
              <Label htmlFor={industry} className="text-sm font-normal cursor-pointer">
                {industry}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Urgency Levels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Priority Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {urgencyLevels.map((level) => (
            <div key={level.id} className="flex items-center space-x-2">
              <Checkbox
                id={level.id}
                checked={selectedFilters.urgency.includes(level.id)}
                onCheckedChange={() => onFilterChange('urgency', level.id)}
              />
              <Label htmlFor={level.id} className="flex items-center space-x-2 text-sm font-normal cursor-pointer">
                <div className={`w-2 h-2 rounded-full bg-${level.color}`} />
                {level.name}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Signal Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Signal Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {signalTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={selectedFilters.signalTypes.includes(type)}
                onCheckedChange={() => onFilterChange('signalTypes', type)}
              />
              <Label htmlFor={type} className="text-sm font-normal cursor-pointer">
                {type}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
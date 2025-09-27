// Agency Filter Component
// Multi-select toggle chips for FDA, FSIS, CDC, EPA with accessibility

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { useAlertFilters, type AgencySource } from '@/hooks/useAlertFilters';
import { useSourceCounts } from '@/hooks/useSourceCounts';
import { AGENCY_CONFIG } from '@/lib/source-mapping';


interface AgencyFilterProps {
  className?: string;
}

export function AgencyFilter({ className }: AgencyFilterProps) {
  const {
    filters,
    isLoading,
    toggleSource,
    setSinceDays,
    setMinSeverity,
    setSearchQuery,
    resetFilters,
  } = useAlertFilters();

  const { sourceCounts, loading: countsLoading } = useSourceCounts();

  const totalSelectedSources = filters.sources.length;
  const hasActiveFilters =
    totalSelectedSources < 5 ||
    filters.sinceDays !== 30 ||
    filters.minSeverity !== null ||
    filters.searchQuery.trim() !== '';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filters
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="ml-auto h-8 px-2 text-xs"
              aria-label="Reset all filters"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <label htmlFor="alert-search" className="text-sm font-medium">
            Search Alerts
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="alert-search"
              type="text"
              placeholder="Search by title, summary, or reason..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Separator />

        {/* Agency Source Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Data Sources
            </label>
            <span className="text-xs text-muted-foreground">
              {totalSelectedSources} of 5 selected
            </span>
          </div>

          <div
            role="group"
            aria-labelledby="agency-filter-label"
            className="grid grid-cols-2 gap-2"
          >
            {(Object.keys(AGENCY_CONFIG) as AgencySource[]).map((source) => {
              const config = AGENCY_CONFIG[source];
              const isSelected = filters.sources.includes(source);
              const count = sourceCounts[source];

              return (
                <Button
                  key={source}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSource(source)}
                  disabled={isLoading}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? 'Remove' : 'Add'} ${config.fullName} alerts`}
                  className={`
                    h-auto p-3 flex flex-col items-start justify-start text-left
                    ${isSelected ? config.selectedColor : config.color}
                    border-2 transition-colors
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">
                      {config.label}
                    </span>
                    {count !== undefined && (
                      <Badge
                        variant="secondary"
                        className={`
                          text-xs px-1.5 py-0.5 min-w-[20px] h-5
                          ${isSelected ? 'bg-white/20 text-white' : 'bg-black/10'}
                        `}
                      >
                        {count}
                      </Badge>
                    )}
                  </div>
                  <span className={`
                    text-xs mt-1 line-clamp-2
                    ${isSelected ? 'text-white/90' : 'text-muted-foreground'}
                  `}>
                    {config.fullName}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Date Range Filter */}
        <div className="space-y-2">
          <label htmlFor="date-range-select" className="text-sm font-medium">
            Time Range
          </label>
          <Select
            value={filters.sinceDays.toString()}
            onValueChange={(value) => setSinceDays(parseInt(value, 10))}
          >
            <SelectTrigger id="date-range-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 2 weeks</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 2 months</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Severity Filter */}
        <div className="space-y-2">
          <label htmlFor="severity-select" className="text-sm font-medium">
            Minimum Severity
          </label>
          <Select
            value={filters.minSeverity?.toString() || 'all'}
            onValueChange={(value) => setMinSeverity(value === 'all' ? null : parseInt(value, 10))}
          >
            <SelectTrigger id="severity-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="70">High severity (70+)</SelectItem>
              <SelectItem value="60">Medium severity (60+)</SelectItem>
              <SelectItem value="40">Low severity (40+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm font-medium">Active Filters:</span>
              <div className="flex flex-wrap gap-1">
                {totalSelectedSources < 5 && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.sources.join(', ')}
                  </Badge>
                )}
                {filters.sinceDays !== 30 && (
                  <Badge variant="secondary" className="text-xs">
                    Last {filters.sinceDays} days
                  </Badge>
                )}
                {filters.minSeverity !== null && (
                  <Badge variant="secondary" className="text-xs">
                    Min severity: {filters.minSeverity}
                  </Badge>
                )}
                {filters.searchQuery.trim() && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{filters.searchQuery.trim()}"
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
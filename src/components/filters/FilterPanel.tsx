import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react';
import { FilterQuery, SourceFilter, SourceType } from '@/types/filter-engine';
import { RegulatoryInputSanitizer } from '@/lib/security/input-sanitizer';
import { toast } from 'sonner';

interface FilterPanelProps {
  onFilterChange: (query: FilterQuery) => void;
  activeFilters: FilterQuery;
  loading?: boolean;
}

const SOURCE_CONFIGS = {
  FDA: {
    name: 'FDA',
    fields: [
      { key: 'product_type', label: 'Product Type', type: 'multi-select', options: ['food', 'device', 'drug', 'cosmetic'] },
      { key: 'recall_class', label: 'Recall Class', type: 'radio', options: ['I', 'II', 'III'] },
      { key: 'event_id', label: 'Event ID', type: 'text' }
    ]
  },
  USDA: {
    name: 'USDA',
    fields: [
      { key: 'product_category', label: 'Product Category', type: 'multi-select', options: ['meat', 'poultry', 'egg'] },
      { key: 'establishment_number', label: 'Establishment', type: 'text' },
      { key: 'haccp_category', label: 'HACCP Category', type: 'radio', options: ['ready_to_eat', 'not_ready_to_eat'] }
    ]
  },
  FSIS: {
    name: 'FSIS',
    fields: [
      { key: 'inspection_type', label: 'Inspection Type', type: 'multi-select', options: ['routine', 'follow_up', 'complaint'] },
      { key: 'violation_code', label: 'Violation Code', type: 'text' },
      { key: 'facility_name', label: 'Facility Search', type: 'text' }
    ]
  },
  WHO: {
    name: 'WHO',
    fields: [
      { key: 'alert_type', label: 'Alert Type', type: 'multi-select', options: ['outbreak', 'epidemic', 'pandemic'] },
      { key: 'country', label: 'Country', type: 'multi-select', options: ['USA', 'UK', 'Canada', 'Australia'] },
      { key: 'pathogen', label: 'Pathogen', type: 'text' }
    ]
  }
} as const;

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onFilterChange,
  activeFilters,
  loading = false
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['shared']));

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Helper functions to convert between FilterValue and display values
  const getDisplayValue = useCallback((filterValue: any): string => {
    if (!filterValue || !filterValue.value) return '';
    const value = filterValue.value;
    
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
      return `${value.min} - ${value.max}`;
    }
    
    return '';
  }, []);

  const getSelectValue = useCallback((filterValue: any): string => {
    if (!filterValue || !filterValue.value) return '';
    return String(filterValue.value);
  }, []);

  const updateSharedFilter = useCallback((key: string, value: any) => {
    // Sanitize input before updating filter
    const sanitizer = RegulatoryInputSanitizer;
    const validation = sanitizer.sanitizeFilterValue(value, 'text');
    
    if (!validation.isValid) {
      toast.error(`Invalid input: ${validation.errors.join(', ')}`);
      return;
    }

    const updated = {
      ...activeFilters,
      shared: {
        ...activeFilters.shared,
        [key]: validation.sanitizedValue
      }
    };
    onFilterChange(updated);
  }, [activeFilters, onFilterChange]);

  const updateSourceFilter = useCallback((sourceType: SourceType, key: string, value: any) => {
    // Sanitize input before updating filter  
    const sanitizer = RegulatoryInputSanitizer;
    const validation = sanitizer.sanitizeFilterValue(value, 'text');
    
    if (!validation.isValid) {
      toast.error(`Invalid input: ${validation.errors.join(', ')}`);
      return;
    }

    const sources = [...activeFilters.sources];
    const sourceIndex = sources.findIndex(s => s.source_type === sourceType);
    
    if (sourceIndex >= 0) {
      sources[sourceIndex] = {
        ...sources[sourceIndex],
        filters: {
          ...sources[sourceIndex].filters,
          [key]: { operator: 'eq', value: validation.sanitizedValue }
        }
      };
    } else {
      sources.push({
        source_type: sourceType,
        enabled: true,
        filters: {
          [key]: { operator: 'eq', value: validation.sanitizedValue }
        }
      });
    }
    
    onFilterChange({
      ...activeFilters,
      sources
    });
  }, [activeFilters, onFilterChange]);

  const toggleSourceEnabled = useCallback((sourceType: SourceType) => {
    const sources = [...activeFilters.sources];
    const sourceIndex = sources.findIndex(s => s.source_type === sourceType);
    
    if (sourceIndex >= 0) {
      sources[sourceIndex].enabled = !sources[sourceIndex].enabled;
    } else {
      sources.push({
        source_type: sourceType,
        enabled: true,
        filters: {}
      });
    }
    
    onFilterChange({
      ...activeFilters,
      sources
    });
  }, [activeFilters, onFilterChange]);

  const clearAllFilters = useCallback(() => {
    onFilterChange({
      sources: [],
      shared: {},
      pagination: { limit: 50, offset: 0 },
      sorting: { field: 'published_date', direction: 'desc' }
    });
  }, [onFilterChange]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Source Filters
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Shared Facets */}
        <Collapsible
          open={expandedSections.has('shared')}
          onOpenChange={() => toggleSection('shared')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
            <span className="font-medium">Shared Filters</span>
            {expandedSections.has('shared') ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium">Keyword</label>
              <Input
                placeholder="Search term..."
                value={activeFilters.shared.keyword || ''}
                onChange={(e) => updateSharedFilter('keyword', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Urgency</label>
              <div className="flex gap-2 mt-1">
                {['Critical', 'High', 'Medium', 'Low'].map(urgency => (
                  <Badge
                    key={urgency}
                    variant={activeFilters.shared.urgency?.includes(urgency) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = activeFilters.shared.urgency || [];
                      const updated = current.includes(urgency)
                        ? current.filter(u => u !== urgency)
                        : [...current, urgency];
                      updateSharedFilter('urgency', updated);
                    }}
                  >
                    {urgency}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Source-Specific Filters */}
        {Object.entries(SOURCE_CONFIGS).map(([sourceType, config]) => {
          const source = activeFilters.sources.find(s => s.source_type === sourceType);
          const isEnabled = source?.enabled || false;
          const isExpanded = expandedSections.has(sourceType);
          
          return (
            <Collapsible
              key={sourceType}
              open={isExpanded}
              onOpenChange={() => toggleSection(sourceType)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={() => toggleSourceEnabled(sourceType as SourceType)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium">{config.name}</span>
                </div>
                {isExpanded ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-3 pt-2 ml-6">
                {config.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-sm font-medium">{field.label}</label>
                    {field.type === 'text' && (
                      <Input
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        value={getDisplayValue(source?.filters[field.key])}
                        onChange={(e) => updateSourceFilter(sourceType as SourceType, field.key, e.target.value)}
                        disabled={!isEnabled}
                      />
                    )}
                    {field.type === 'radio' && field.options && (
                      <Select
                        value={getSelectValue(source?.filters[field.key])}
                        onValueChange={(value) => updateSourceFilter(sourceType as SourceType, field.key, value)}
                        disabled={!isEnabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
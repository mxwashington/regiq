import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
  active: boolean;
}

interface MobileSearchInterfaceProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    agencies: FilterOption[];
    urgency: FilterOption[];
    categories: FilterOption[];
  };
  onFilterChange: (filterId: string, filterType: 'agencies' | 'urgency' | 'categories') => void;
  onClearFilters: () => void;
  placeholder?: string;
  className?: string;
}

export const MobileSearchInterface: React.FC<MobileSearchInterfaceProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  placeholder = "Search regulatory alerts...",
  className
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isMobile, addTouchFeedback } = useMobileOptimization();

  // Count active filters
  const activeFiltersCount = Object.values(filters).flat().filter(f => f.active).length;

  // Add touch feedback to filter buttons
  useEffect(() => {
    const filterButtons = document.querySelectorAll('.mobile-filter-button');
    const cleanupFunctions: (() => void)[] = [];

    if (isMobile) {
      filterButtons.forEach(button => {
        const cleanup = addTouchFeedback(button as HTMLElement);
        if (cleanup) cleanupFunctions.push(cleanup);
      });
    }

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [addTouchFeedback, isMobile]);

  const handleSearchFocus = () => {
    setSearchFocused(true);
    
    // Scroll to top to prevent keyboard from hiding search
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
  };

  const handleClearSearch = () => {
    onSearchChange('');
    searchInputRef.current?.focus();
  };

  const renderFilterSection = (
    title: string,
    options: FilterOption[],
    filterType: 'agencies' | 'urgency' | 'categories'
  ) => (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-foreground">{title}</h4>
      <div className="grid grid-cols-1 gap-2">
        {options.map(option => (
          <Button
            key={option.id}
            variant={option.active ? "default" : "outline"}
            size="sm"
            className={cn(
              'mobile-filter-button justify-between h-11 text-left touch-manipulation',
              option.active && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onFilterChange(option.id, filterType)}
          >
            <span className="truncate">{option.label}</span>
            {option.count !== undefined && (
              <Badge 
                variant={option.active ? "secondary" : "outline"}
                className="ml-2 text-xs"
              >
                {option.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn('mobile-search-interface space-y-4', className)}>
      {/* Search Input */}
      <div className={cn(
        'relative transition-all duration-200',
        searchFocused && isMobile && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            className={cn(
              'pl-10 pr-10 touch-manipulation',
              isMobile ? 'h-12 text-base rounded-lg' : 'h-10',
              searchFocused && 'border-primary focus:border-primary'
            )}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Filter Interface */}
      {isMobile ? (
        <div className="flex items-center gap-2">
          {/* Active Agencies Filter Pills - Horizontal Scroll */}
          <ScrollArea className="flex-1">
            <div className="flex gap-2 pb-2">
              {filters.agencies.filter(f => f.active).map(agency => (
                <Badge
                  key={agency.id}
                  variant="default"
                  className="shrink-0 px-3 py-1 touch-manipulation"
                >
                  {agency.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => onFilterChange(agency.id, 'agencies')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </ScrollArea>

          {/* Filter Sheet Trigger */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2 h-10 touch-manipulation relative"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs rounded-full flex items-center justify-center"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>

            <SheetContent side="bottom" className="max-h-[80vh]">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center justify-between">
                  Filter Alerts
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearFilters}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="flex-1 mt-6">
                <div className="space-y-6 pb-6">
                  {renderFilterSection('Agencies', filters.agencies, 'agencies')}
                  {renderFilterSection('Priority Level', filters.urgency, 'urgency')}
                  {renderFilterSection('Categories', filters.categories, 'categories')}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        /* Desktop Filter Pills */
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([filterType, options]) =>
            options.filter(f => f.active).map(option => (
              <Badge
                key={`${filterType}-${option.id}`}
                variant="default"
                className="gap-1 px-3 py-1"
              >
                {option.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => onFilterChange(option.id, filterType as any)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      )}
    </div>
  );
};
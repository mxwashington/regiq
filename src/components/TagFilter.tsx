import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  category: string;
}

interface ActiveFilter {
  categoryId: string;
  categoryName: string;
  tagId: string;
  tagName: string;
  color: string;
}

interface TagFilterProps {
  taxonomyData: {
    categories: Array<{
      id: string;
      name: string;
      tags: Tag[];
    }>;
  };
  activeFilters: ActiveFilter[];
  onFilterChange: (filters: ActiveFilter[]) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({
  taxonomyData,
  activeFilters,
  onFilterChange
}) => {
  const handleTagClick = (categoryId: string, categoryName: string, tag: Tag) => {
    const existingFilterIndex = activeFilters.findIndex(
      f => f.categoryId === categoryId && f.tagId === tag.id
    );

    let newFilters: ActiveFilter[];
    
    if (existingFilterIndex >= 0) {
      // Remove existing filter
      newFilters = activeFilters.filter((_, index) => index !== existingFilterIndex);
    } else {
      // Replace any existing filter in this category or add new one
      newFilters = activeFilters.filter(f => f.categoryId !== categoryId);
      newFilters.push({
        categoryId,
        categoryName,
        tagId: tag.id,
        tagName: tag.name,
        color: tag.color
      });
    }
    
    onFilterChange(newFilters);
  };

  const handleRemoveFilter = (filterToRemove: ActiveFilter) => {
    const newFilters = activeFilters.filter(
      f => !(f.categoryId === filterToRemove.categoryId && f.tagId === filterToRemove.tagId)
    );
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange([]);
  };

  const isTagActive = (categoryId: string, tagId: string) => {
    return activeFilters.some(f => f.categoryId === categoryId && f.tagId === tagId);
  };

  return (
    <div className="space-y-6">
      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Filters</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <Badge
                  key={`${filter.categoryId}-${filter.tagId}`}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                  style={{
                    backgroundColor: `${filter.color}20`,
                    borderColor: filter.color,
                    color: filter.color
                  }}
                >
                  <span className="text-xs">
                    {filter.categoryName}: {filter.tagName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveFilter(filter)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Categories */}
      <div className="space-y-4">
        {taxonomyData.categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {category.tags.map((tag) => {
                  const isActive = isTagActive(category.id, tag.id);
                  return (
                    <Button
                      key={tag.id}
                      variant={isActive ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleTagClick(category.id, category.name, tag)}
                      className={`h-7 px-3 text-xs transition-all ${
                        isActive 
                          ? 'border-2 shadow-sm' 
                          : 'hover:border-2 hover:shadow-sm'
                      }`}
                      style={{
                        backgroundColor: isActive ? `${tag.color}20` : 'transparent',
                        borderColor: isActive ? tag.color : undefined,
                        color: isActive ? tag.color : undefined
                      }}
                    >
                      {tag.name}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TagFilter;
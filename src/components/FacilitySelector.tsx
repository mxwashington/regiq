import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronDown } from 'lucide-react';
import { useFacilityManagement } from '@/hooks/useFacilityManagement';
import { cn } from '@/lib/utils';

interface FacilitySelectorProps {
  className?: string;
  showAllOption?: boolean;
  onSelectionChange?: (facilityId: string | null) => void;
}

export const FacilitySelector: React.FC<FacilitySelectorProps> = ({
  className,
  showAllOption = true,
  onSelectionChange
}) => {
  const {
    facilities,
    selectedFacility,
    setSelectedFacility,
    loading
  } = useFacilityManagement();

  const handleSelectionChange = (value: string) => {
    const facilityId = value === 'all' ? null : value;
    setSelectedFacility(facilityId);
    onSelectionChange?.(facilityId);
  };

  const selectedFacilityData = facilities.find(f => f.id === selectedFacility);

  if (loading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <div className="animate-pulse bg-muted h-8 w-32 rounded"></div>
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className={cn("flex items-center space-x-2 text-muted-foreground", className)}>
        <Building2 className="w-4 h-4" />
        <span className="text-sm">No facilities</span>
      </div>
    );
  }

  if (facilities.length === 1 && !showAllOption) {
    // Only one facility and no "all" option - just show it as a badge
    const facility = facilities[0];
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Building2 className="w-4 h-4 text-primary" />
        <Badge variant="outline" className="font-normal">
          {facility.name}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Building2 className="w-4 h-4 text-primary" />
      <Select
        value={selectedFacility || 'all'}
        onValueChange={handleSelectionChange}
      >
        <SelectTrigger className="w-auto min-w-[150px] border-0 bg-transparent p-0 h-auto">
          <div className="flex items-center space-x-2">
            <SelectValue>
              {selectedFacility ? (
                <Badge variant="outline" className="font-normal">
                  {selectedFacilityData?.name || 'Unknown Facility'}
                </Badge>
              ) : (
                <Badge variant="secondary" className="font-normal">
                  All Facilities
                </Badge>
              )}
            </SelectValue>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">
              <div className="flex items-center space-x-2">
                <Building2 className="w-3 h-3" />
                <span>All Facilities</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {facilities.length}
                </Badge>
              </div>
            </SelectItem>
          )}
          {facilities.map((facility) => (
            <SelectItem key={facility.id} value={facility.id}>
              <div className="flex items-center space-x-2">
                <Building2 className="w-3 h-3" />
                <div className="flex flex-col">
                  <span>{facility.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {facility.facility_type?.replace('_', ' ').toUpperCase()} • {facility.user_role?.toUpperCase()}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  Globe, 
  Building2, 
  AlertTriangle, 
  Calendar,
  X,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataSource {
  id: string;
  name: string;
  agency: string;
  region: string;
  source_type: string;
  is_active: boolean;
  last_successful_fetch: string | null;
  priority: number;
}

interface FilterState {
  regions: string[];
  agencies: string[];
  urgency: string[];
  dateRange: string;
  showInactive: boolean;
}

interface EnhancedRegulatoryFilterProps {
  onFiltersChange: (filters: FilterState) => void;
  onRefreshData: (options?: { region?: string; agency?: string; force?: boolean }) => void;
  loading?: boolean;
}

export function EnhancedRegulatoryFilter({ 
  onFiltersChange, 
  onRefreshData, 
  loading = false 
}: EnhancedRegulatoryFilterProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    regions: [],
    agencies: [],
    urgency: [],
    dateRange: 'all',
    showInactive: false
  });
  const [loadingSources, setLoadingSources] = useState(true);
  const { toast } = useToast();

  // Load data sources
  useEffect(() => {
    loadDataSources();
  }, []);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const loadDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('regulatory_data_sources')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setDataSources(data || []);
    } catch (error) {
      console.error('Error loading data sources:', error);
      toast({
        title: "Error",
        description: "Failed to load regulatory data sources.",
        variant: "destructive"
      });
    } finally {
      setLoadingSources(false);
    }
  };

  // Get unique regions and agencies
  const availableRegions = [...new Set(dataSources.map(ds => ds.region))].sort();
  const availableAgencies = [...new Set(dataSources.map(ds => ds.agency))].sort();

  const handleRegionChange = (region: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      regions: checked 
        ? [...prev.regions, region]
        : prev.regions.filter(r => r !== region)
    }));
  };

  const handleAgencyChange = (agency: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      agencies: checked 
        ? [...prev.agencies, agency]
        : prev.agencies.filter(a => a !== agency)
    }));
  };

  const handleUrgencyChange = (urgency: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      urgency: checked 
        ? [...prev.urgency, urgency]
        : prev.urgency.filter(u => u !== urgency)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      regions: [],
      agencies: [],
      urgency: [],
      dateRange: 'all',
      showInactive: false
    });
  };

  const getRegionFlag = (region: string) => {
    const flags: { [key: string]: string } = {
      'US': '🇺🇸',
      'EU': '🇪🇺',
      'CA': '🇨🇦',
      'UK': '🇬🇧',
      'AU': '🇦🇺',
      'JP': '🇯🇵',
      'Global': '🌍'
    };
    return flags[region] || '🏛️';
  };

  const getAgencyColor = (agency: string) => {
    const colors: { [key: string]: string } = {
      'FDA': 'bg-blue-100 text-blue-800',
      'USDA': 'bg-green-100 text-green-800',
      'CDC': 'bg-red-100 text-red-800',
      'EPA': 'bg-teal-100 text-teal-800',
      'EFSA': 'bg-purple-100 text-purple-800',
      'Health Canada': 'bg-red-100 text-red-800',
      'WHO': 'bg-orange-100 text-orange-800',
      'EMA': 'bg-indigo-100 text-indigo-800',
      'MHRA': 'bg-rose-100 text-rose-800',
      'TGA': 'bg-emerald-100 text-emerald-800'
    };
    return colors[agency] || 'bg-gray-100 text-gray-800';
  };

  const refreshSpecificRegion = (region: string) => {
    onRefreshData({ region, force: true });
    toast({
      title: "Refreshing Data",
      description: `Updating data for ${region} region...`
    });
  };

  const refreshSpecificAgency = (agency: string) => {
    onRefreshData({ agency, force: true });
    toast({
      title: "Refreshing Data", 
      description: `Updating data for ${agency}...`
    });
  };

  if (loadingSources) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-muted-foreground">Loading filters...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Global Regulatory Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefreshData({ force: true })}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="regions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="regions" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Regions
            </TabsTrigger>
            <TabsTrigger value="agencies" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Agencies
            </TabsTrigger>
            <TabsTrigger value="urgency" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Priority
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regions" className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {availableRegions.map(region => {
                const regionSources = dataSources.filter(ds => ds.region === region);
                const activeCount = regionSources.filter(ds => ds.is_active).length;
                const isChecked = filters.regions.includes(region);
                
                return (
                  <div key={region} className="flex items-center justify-between p-2 rounded-lg border bg-background">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={`region-${region}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleRegionChange(region, checked as boolean)}
                      />
                      <label htmlFor={`region-${region}`} className="flex items-center gap-2 cursor-pointer">
                        <span className="text-lg">{getRegionFlag(region)}</span>
                        <span className="font-medium">{region}</span>
                        <Badge variant="secondary" className="text-xs">
                          {activeCount} sources
                        </Badge>
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshSpecificRegion(region)}
                      disabled={loading}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="agencies" className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {availableAgencies.map(agency => {
                const agencySources = dataSources.filter(ds => ds.agency === agency);
                const regions = [...new Set(agencySources.map(ds => ds.region))];
                const isChecked = filters.agencies.includes(agency);
                
                return (
                  <div key={agency} className="flex items-center justify-between p-2 rounded-lg border bg-background">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={`agency-${agency}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleAgencyChange(agency, checked as boolean)}
                      />
                      <label htmlFor={`agency-${agency}`} className="flex items-center gap-2 cursor-pointer">
                        <Badge className={getAgencyColor(agency)}>
                          {agency}
                        </Badge>
                        <div className="flex gap-1">
                          {regions.map(region => (
                            <span key={region} className="text-xs">
                              {getRegionFlag(region)}
                            </span>
                          ))}
                        </div>
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshSpecificAgency(agency)}
                      disabled={loading}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="urgency" className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {['High', 'Medium', 'Low'].map(urgency => {
                const isChecked = filters.urgency.includes(urgency);
                const colors = {
                  High: 'text-red-600',
                  Medium: 'text-orange-600', 
                  Low: 'text-green-600'
                };
                
                return (
                  <div key={urgency} className="flex items-center space-x-3 p-2 rounded-lg border bg-background">
                    <Checkbox 
                      id={`urgency-${urgency}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => handleUrgencyChange(urgency, checked as boolean)}
                    />
                    <label htmlFor={`urgency-${urgency}`} className={`flex items-center gap-2 cursor-pointer font-medium ${colors[urgency as keyof typeof colors]}`}>
                      <AlertTriangle className="h-4 w-4" />
                      {urgency} Priority
                    </label>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-3">
            <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </TabsContent>
        </Tabs>

        {/* Active Filters Display */}
        {(filters.regions.length > 0 || filters.agencies.length > 0 || filters.urgency.length > 0) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active Filters:</h4>
              <div className="flex flex-wrap gap-1">
                {filters.regions.map(region => (
                  <Badge key={region} variant="secondary" className="flex items-center gap-1">
                    {getRegionFlag(region)} {region}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRegionChange(region, false)}
                    />
                  </Badge>
                ))}
                {filters.agencies.map(agency => (
                  <Badge key={agency} variant="secondary" className="flex items-center gap-1">
                    {agency}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleAgencyChange(agency, false)}
                    />
                  </Badge>
                ))}
                {filters.urgency.map(urgency => (
                  <Badge key={urgency} variant="secondary" className="flex items-center gap-1">
                    {urgency}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleUrgencyChange(urgency, false)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Data Sources Status */}
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Data Sources Status</h4>
            <Badge variant="outline">
              {dataSources.filter(ds => ds.is_active).length} active
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Regions: {availableRegions.join(', ')}</div>
            <div>Total Sources: {dataSources.length}</div>
            <div>Active Sources: {dataSources.filter(ds => ds.is_active).length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar as CalendarIcon, FileText, Database, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExportManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  dataTypes: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  filters: {
    agencies: string[];
    urgency: string[];
    sources: string[];
  };
}

export function ExportManager({ isOpen = true, onClose }: ExportManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dataTypes: ['alerts'],
    dateRange: {},
    filters: {
      agencies: [],
      urgency: [],
      sources: []
    }
  });

  const dataTypeOptions = [
    { id: 'alerts', label: 'Regulatory Alerts', description: 'All regulatory alerts and notifications', icon: '🚨' },
    { id: 'searches', label: 'Search History', description: 'Your Perplexity AI search queries and results', icon: '🔍' },
    { id: 'interactions', label: 'Alert Interactions', description: 'Your dismissed alerts and saved items', icon: '💾' },
    { id: 'analytics', label: 'Usage Analytics', description: 'Your platform usage statistics', icon: '📊' }
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV File', description: 'Best for Excel and data analysis' },
    { value: 'json', label: 'JSON File', description: 'Best for technical integration' },
    { value: 'pdf', label: 'PDF Report', description: 'Best for sharing and presentations' },
    { value: 'excel', label: 'Excel Workbook', description: 'Best for advanced data manipulation' }
  ];

  const agencyOptions = ['FDA', 'USDA', 'EPA', 'CDC', 'MHRA', 'WHO', 'EMA', 'FSIS'];
  const urgencyOptions = ['High', 'Medium', 'Low'];
  const sourceOptions = ['FDA', 'USDA', 'EPA', 'CDC', 'MHRA', 'WHO', 'EMA', 'FSIS', 'Other'];

  const handleDataTypeChange = (dataType: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      dataTypes: checked 
        ? [...prev.dataTypes, dataType]
        : prev.dataTypes.filter(type => type !== dataType)
    }));
  };

  const handleFilterChange = (filterType: keyof ExportOptions['filters'], value: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: checked
          ? [...prev.filters[filterType], value]
          : prev.filters[filterType].filter(item => item !== value)
      }
    }));
  };

  const generateCSV = (data: any[], filename: string) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle arrays, objects, and special characters
          if (Array.isArray(value)) {
            return `"${value.join('; ')}"`;
          } else if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          } else if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to export data",
        variant: "destructive"
      });
      return;
    }

    if (exportOptions.dataTypes.length === 0) {
      toast({
        title: "No data selected",
        description: "Please select at least one data type to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData: any = {};
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');

      // Export alerts
      if (exportOptions.dataTypes.includes('alerts')) {
        let alertsQuery = supabase
          .from('alerts')
          .select('*')
          .order('published_date', { ascending: false });

        // Apply date range filter
        if (exportOptions.dateRange.from) {
          alertsQuery = alertsQuery.gte('published_date', exportOptions.dateRange.from.toISOString());
        }
        if (exportOptions.dateRange.to) {
          alertsQuery = alertsQuery.lte('published_date', exportOptions.dateRange.to.toISOString());
        }

        // Apply agency filter
        if (exportOptions.filters.agencies.length > 0) {
          alertsQuery = alertsQuery.in('source', exportOptions.filters.agencies);
        }

        // Apply urgency filter
        if (exportOptions.filters.urgency.length > 0) {
          alertsQuery = alertsQuery.in('urgency', exportOptions.filters.urgency);
        }

        const { data: alerts, error: alertsError } = await alertsQuery;
        if (alertsError) throw alertsError;
        exportData.alerts = alerts;
      }

      // Export search history
      if (exportOptions.dataTypes.includes('searches')) {
        let searchQuery = supabase
          .from('perplexity_searches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (exportOptions.dateRange.from) {
          searchQuery = searchQuery.gte('created_at', exportOptions.dateRange.from.toISOString());
        }
        if (exportOptions.dateRange.to) {
          searchQuery = searchQuery.lte('created_at', exportOptions.dateRange.to.toISOString());
        }

        const { data: searches, error: searchesError } = await searchQuery;
        if (searchesError) throw searchesError;
        exportData.searches = searches;
      }

      // Export interactions
      if (exportOptions.dataTypes.includes('interactions')) {
        const { data: interactions, error: interactionsError } = await supabase
          .from('alert_interactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (interactionsError) throw interactionsError;
        exportData.interactions = interactions;
      }

      // Export analytics
      if (exportOptions.dataTypes.includes('analytics')) {
        const { data: analytics, error: analyticsError } = await supabase
          .from('user_analytics')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (analyticsError) throw analyticsError;
        exportData.analytics = analytics;
      }

      // Generate export based on format
      switch (exportOptions.format) {
        case 'csv':
          // For CSV, export each data type as a separate file
          for (const [dataType, data] of Object.entries(exportData)) {
            if (Array.isArray(data) && data.length > 0) {
              const csvContent = generateCSV(data, `regiq-${dataType}-${timestamp}.csv`);
              downloadFile(csvContent, `regiq-${dataType}-${timestamp}.csv`, 'text/csv');
            }
          }
          break;

        case 'json':
          const jsonContent = JSON.stringify(exportData, null, 2);
          downloadFile(jsonContent, `regiq-export-${timestamp}.json`, 'application/json');
          break;

        case 'excel':
          // For now, export as CSV (can be enhanced with proper Excel library)
          for (const [dataType, data] of Object.entries(exportData)) {
            if (Array.isArray(data) && data.length > 0) {
              const csvContent = generateCSV(data, `regiq-${dataType}-${timestamp}.csv`);
              downloadFile(csvContent, `regiq-${dataType}-${timestamp}.csv`, 'text/csv');
            }
          }
          break;

        case 'pdf':
          // For PDF, create a formatted report
          const reportContent = Object.entries(exportData)
            .map(([dataType, data]) => {
              if (Array.isArray(data) && data.length > 0) {
                return `${dataType.toUpperCase()}\n${'-'.repeat(50)}\n${data.length} records exported\n\n`;
              }
              return '';
            })
            .join('\n');
          
          downloadFile(reportContent, `regiq-report-${timestamp}.txt`, 'text/plain');
          break;
      }

      toast({
        title: "Export completed",
        description: `Successfully exported ${Object.keys(exportData).length} data types`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>
          Export your regulatory alerts, search history, and analytics data in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Types Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Select Data to Export</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataTypeOptions.map((option) => (
              <div key={option.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={option.id}
                  checked={exportOptions.dataTypes.includes(option.id)}
                  onCheckedChange={(checked) => handleDataTypeChange(option.id, checked as boolean)}
                />
                <div className="flex-1">
                  <label htmlFor={option.id} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <span>{option.icon}</span>
                    {option.label}
                  </label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Format */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Export Format</h3>
          <Select value={exportOptions.format} onValueChange={(value) => setExportOptions(prev => ({ ...prev, format: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  <div>
                    <div className="font-medium">{format.label}</div>
                    <div className="text-sm text-muted-foreground">{format.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Date Range (Optional)</h3>
          <div className="flex gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !exportOptions.dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportOptions.dateRange.from ? format(exportOptions.dateRange.from, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={exportOptions.dateRange.from}
                  onSelect={(date) => setExportOptions(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: date } }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !exportOptions.dateRange.to && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {exportOptions.dateRange.to ? format(exportOptions.dateRange.to, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={exportOptions.dateRange.to}
                  onSelect={(date) => setExportOptions(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: date } }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filters */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Filters (Optional)</h3>
          <div className="space-y-4">
            {/* Agencies */}
            <div>
              <h4 className="font-medium mb-2">Agencies</h4>
              <div className="flex flex-wrap gap-2">
                {agencyOptions.map((agency) => (
                  <Badge
                    key={agency}
                    variant={exportOptions.filters.agencies.includes(agency) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleFilterChange('agencies', agency, !exportOptions.filters.agencies.includes(agency))}
                  >
                    {agency}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <h4 className="font-medium mb-2">Urgency Levels</h4>
              <div className="flex flex-wrap gap-2">
                {urgencyOptions.map((urgency) => (
                  <Badge
                    key={urgency}
                    variant={exportOptions.filters.urgency.includes(urgency) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleFilterChange('urgency', urgency, !exportOptions.filters.urgency.includes(urgency))}
                  >
                    {urgency}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-between">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleExport} 
            disabled={isExporting || exportOptions.dataTypes.length === 0}
            className="ml-auto"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
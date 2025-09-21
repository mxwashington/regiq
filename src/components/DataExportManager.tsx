import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Database, Calendar } from 'lucide-react';
import { useExportData, ExportOptions } from '@/hooks/useExportData';

export const DataExportManager: React.FC = () => {
  const { exporting, exportAlerts, exportSuppliers, exportTasks } = useExportData();
  const [format, setFormat] = useState<'csv' | 'pdf' | 'json'>('csv');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [urgencyThreshold, setUrgencyThreshold] = useState<number>(0);
  const [includeSuppliers, setIncludeSuppliers] = useState(false);
  const [includeTasks, setIncludeTasks] = useState(false);

  const handleExport = async (type: 'alerts' | 'suppliers' | 'tasks') => {
    const options: ExportOptions = {
      format,
      dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
      urgencyThreshold: urgencyThreshold > 0 ? urgencyThreshold : undefined,
      includeSuppliers,
      includeTasks
    };

    switch (type) {
      case 'alerts':
        await exportAlerts(options);
        break;
      case 'suppliers':
        await exportSuppliers(options);
        break;
      case 'tasks':
        await exportTasks(options);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Format */}
          <div className="grid gap-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(value: 'csv' | 'pdf' | 'json') => setFormat(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV - Spreadsheet compatible</SelectItem>
                <SelectItem value="pdf">PDF - Formatted report</SelectItem>
                <SelectItem value="json">JSON - Raw data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid gap-2">
            <Label>Date Range (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                placeholder="Start date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <Input
                type="date"
                placeholder="End date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          {/* Urgency Filter */}
          <div className="grid gap-2">
            <Label>Minimum Urgency Score (0-10)</Label>
            <Input
              type="number"
              min="0"
              max="10"
              placeholder="0"
              value={urgencyThreshold}
              onChange={(e) => setUrgencyThreshold(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Alerts</span>
                </div>
                <Button
                  onClick={() => handleExport('alerts')}
                  disabled={exporting}
                  size="sm"
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Export regulatory alerts with AI summaries and urgency scores
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Suppliers</span>
                </div>
                <Button
                  onClick={() => handleExport('suppliers')}
                  disabled={exporting}
                  size="sm"
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Export supplier data with risk scores and monitoring history
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Tasks</span>
                </div>
                <Button
                  onClick={() => handleExport('tasks')}
                  disabled={exporting}
                  size="sm"
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Export compliance tasks and action items
              </p>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>CSV:</strong> Best for Excel/Google Sheets analysis</li>
            <li>• <strong>PDF:</strong> Professional reports with formatting</li>
            <li>• <strong>JSON:</strong> Raw data for API integration</li>
            <li>• Large exports (&gt;1000 records) may take several seconds</li>
            <li>• Date filters help reduce export size and improve performance</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
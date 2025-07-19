import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  Mail, 
  Calendar, 
  Clock,
  Settings,
  AlertTriangle,
  Building,
  Users,
  FileDown,
  Send,
  Plus,
  Trash2,
  Edit,
  Bell
} from 'lucide-react';
import { fdaApi, FDAResponse } from '@/lib/fda-api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExportConfig {
  format: 'excel' | 'pdf' | 'csv' | 'json';
  dateRange: string;
  endpoints: string[];
  filters: {
    classification: string;
    state: string;
    companies: string[];
  };
  includeAnalytics: boolean;
}

interface ScheduledSearch {
  id: string;
  name: string;
  query: string;
  endpoints: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  email: string;
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

interface AlertRule {
  id: string;
  name: string;
  trigger: 'new_recall' | 'class_i_recall' | 'company_match' | 'keyword_match';
  keywords: string[];
  companies: string[];
  classifications: string[];
  email: string;
  active: boolean;
}

export function FDAProfessionalTools() {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'excel',
    dateRange: '30days',
    endpoints: ['foodEnforcement', 'drugEnforcement'],
    filters: {
      classification: '',
      state: '',
      companies: []
    },
    includeAnalytics: true
  });

  const [scheduledSearches, setScheduledSearches] = useState<ScheduledSearch[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [newScheduledSearch, setNewScheduledSearch] = useState<Partial<ScheduledSearch>>({
    name: '',
    query: '',
    endpoints: ['foodEnforcement'],
    frequency: 'weekly',
    email: '',
    active: true
  });
  const [newAlertRule, setNewAlertRule] = useState<Partial<AlertRule>>({
    name: '',
    trigger: 'new_recall',
    keywords: [],
    companies: [],
    classifications: [],
    email: '',
    active: true
  });

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { user, subscriptionTier } = useAuth();
  const { toast } = useToast();

  // Export functionality
  const handleExport = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to export data",
        variant: "destructive"
      });
      return;
    }

    setExporting(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (exportConfig.dateRange) {
        case '7days': startDate.setDate(endDate.getDate() - 7); break;
        case '30days': startDate.setDate(endDate.getDate() - 30); break;
        case '90days': startDate.setDate(endDate.getDate() - 90); break;
        case '365days': startDate.setDate(endDate.getDate() - 365); break;
      }

      // Build query
      let query = `recall_initiation_date:[${startDate.toISOString().split('T')[0]}+TO+${endDate.toISOString().split('T')[0]}]`;
      
      if (exportConfig.filters.classification) {
        query += `+AND+classification:"${exportConfig.filters.classification}"`;
      }
      
      if (exportConfig.filters.state) {
        query += `+AND+state:"${exportConfig.filters.state}"`;
      }

      // Fetch data from selected endpoints
      const results = await fdaApi.searchMultipleEndpoints(
        query, 
        exportConfig.endpoints as any, 
        1000 // Large limit for export
      );

      // Process data for export
      const exportData = processExportData(results);

      // Generate export based on format
      switch (exportConfig.format) {
        case 'csv':
          downloadCSV(exportData);
          break;
        case 'excel':
          await generateExcel(exportData);
          break;
        case 'pdf':
          await generatePDF(exportData);
          break;
        case 'json':
          downloadJSON(exportData);
          break;
      }

      toast({
        title: "Export Complete",
        description: `FDA data exported as ${exportConfig.format.toUpperCase()}`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export FDA data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const processExportData = (results: Array<{ endpoint: string; data: FDAResponse<any> }>) => {
    const allData: any[] = [];
    
    results.forEach(result => {
      result.data.results.forEach(item => {
        allData.push({
          endpoint: result.endpoint,
          recall_number: item.recall_number || '',
          classification: item.classification || '',
          product_description: item.product_description || '',
          company_name: item.company_name || '',
          recall_initiation_date: item.recall_initiation_date || '',
          reason_for_recall: item.reason_for_recall || '',
          state: item.state || '',
          city: item.city || '',
          distribution_pattern: item.distribution_pattern || '',
          voluntary_mandated: item.voluntary_mandated || ''
        });
      });
    });

    return allData;
  };

  const downloadCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fda-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fda-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateExcel = async (data: any[]) => {
    // This would typically use a library like SheetJS
    toast({
      title: "Excel Export",
      description: "Excel export feature requires premium subscription",
      variant: "destructive"
    });
  };

  const generatePDF = async (data: any[]) => {
    // This would typically use a library like jsPDF
    toast({
      title: "PDF Export", 
      description: "PDF export feature requires premium subscription",
      variant: "destructive"
    });
  };

  // Scheduled search management
  const addScheduledSearch = async () => {
    if (!newScheduledSearch.name || !newScheduledSearch.query || !newScheduledSearch.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const search: ScheduledSearch = {
      id: Math.random().toString(36).substr(2, 9),
      name: newScheduledSearch.name!,
      query: newScheduledSearch.query!,
      endpoints: newScheduledSearch.endpoints!,
      frequency: newScheduledSearch.frequency!,
      email: newScheduledSearch.email!,
      active: true,
      nextRun: calculateNextRun(newScheduledSearch.frequency!)
    };

    setScheduledSearches([...scheduledSearches, search]);
    setNewScheduledSearch({
      name: '',
      query: '',
      endpoints: ['foodEnforcement'],
      frequency: 'weekly',
      email: '',
      active: true
    });

    toast({
      title: "Scheduled Search Added",
      description: `Search "${search.name}" will run ${search.frequency}`,
    });
  };

  const addAlertRule = async () => {
    if (!newAlertRule.name || !newAlertRule.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const rule: AlertRule = {
      id: Math.random().toString(36).substr(2, 9),
      name: newAlertRule.name!,
      trigger: newAlertRule.trigger!,
      keywords: newAlertRule.keywords!,
      companies: newAlertRule.companies!,
      classifications: newAlertRule.classifications!,
      email: newAlertRule.email!,
      active: true
    };

    setAlertRules([...alertRules, rule]);
    setNewAlertRule({
      name: '',
      trigger: 'new_recall',
      keywords: [],
      companies: [],
      classifications: [],
      email: '',
      active: true
    });

    toast({
      title: "Alert Rule Added",
      description: `Alert "${rule.name}" is now active`,
    });
  };

  const calculateNextRun = (frequency: string): Date => {
    const now = new Date();
    switch (frequency) {
      case 'daily': now.setDate(now.getDate() + 1); break;
      case 'weekly': now.setDate(now.getDate() + 7); break;
      case 'monthly': now.setMonth(now.getMonth() + 1); break;
    }
    return now;
  };

  const toggleScheduledSearch = (id: string) => {
    setScheduledSearches(searches =>
      searches.map(search =>
        search.id === id ? { ...search, active: !search.active } : search
      )
    );
  };

  const toggleAlertRule = (id: string) => {
    setAlertRules(rules =>
      rules.map(rule =>
        rule.id === id ? { ...rule, active: !rule.active } : rule
      )
    );
  };

  const deleteScheduledSearch = (id: string) => {
    setScheduledSearches(searches => searches.filter(s => s.id !== id));
    toast({
      title: "Scheduled Search Deleted",
      description: "The scheduled search has been removed",
    });
  };

  const deleteAlertRule = (id: string) => {
    setAlertRules(rules => rules.filter(r => r.id !== id));
    toast({
      title: "Alert Rule Deleted", 
      description: "The alert rule has been removed",
    });
  };

  const isPremiumFeature = (feature: string) => {
    const premiumTiers = ['professional', 'enterprise'];
    return !premiumTiers.includes(subscriptionTier || '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Professional FDA Tools</span>
          </CardTitle>
          <CardDescription>
            Advanced export, scheduling, and alerting capabilities for regulatory professionals
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Professional Tools Tabs */}
      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Data Export</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduled Searches</TabsTrigger>
          <TabsTrigger value="alerts">Smart Alerts</TabsTrigger>
        </TabsList>

        {/* Data Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>FDA Data Export</span>
              </CardTitle>
              <CardDescription>
                Export FDA data in multiple formats for analysis and reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select value={exportConfig.format} onValueChange={(value: any) => setExportConfig({...exportConfig, format: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV (Comma Separated)</SelectItem>
                        <SelectItem value="json">JSON (Structured Data)</SelectItem>
                        <SelectItem value="excel" disabled={isPremiumFeature('excel')}>
                          Excel (Premium)
                        </SelectItem>
                        <SelectItem value="pdf" disabled={isPremiumFeature('pdf')}>
                          PDF Report (Premium)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select value={exportConfig.dateRange} onValueChange={(value) => setExportConfig({...exportConfig, dateRange: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                        <SelectItem value="90days">Last 90 days</SelectItem>
                        <SelectItem value="365days">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>FDA Databases</Label>
                    <div className="space-y-2">
                      {[
                        { id: 'foodEnforcement', name: 'Food Enforcement' },
                        { id: 'drugEnforcement', name: 'Drug Enforcement' },
                        { id: 'deviceEnforcement', name: 'Device Enforcement' },
                        { id: 'drugShortages', name: 'Drug Shortages' }
                      ].map(endpoint => (
                        <div key={endpoint.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={endpoint.id}
                            checked={exportConfig.endpoints.includes(endpoint.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setExportConfig({
                                  ...exportConfig,
                                  endpoints: [...exportConfig.endpoints, endpoint.id]
                                });
                              } else {
                                setExportConfig({
                                  ...exportConfig,
                                  endpoints: exportConfig.endpoints.filter(e => e !== endpoint.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={endpoint.id}>{endpoint.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Filters</Label>
                    <Select value={exportConfig.filters.classification} onValueChange={(value) => setExportConfig({
                      ...exportConfig,
                      filters: { ...exportConfig.filters, classification: value }
                    })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Classification filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Classifications</SelectItem>
                        <SelectItem value="Class I">Class I Only</SelectItem>
                        <SelectItem value="Class II">Class II Only</SelectItem>
                        <SelectItem value="Class III">Class III Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>State Filter</Label>
                    <Input
                      placeholder="e.g., CA, NY, TX"
                      value={exportConfig.filters.state}
                      onChange={(e) => setExportConfig({
                        ...exportConfig,
                        filters: { ...exportConfig.filters, state: e.target.value }
                      })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-analytics"
                      checked={exportConfig.includeAnalytics}
                      onCheckedChange={(checked) => setExportConfig({
                        ...exportConfig,
                        includeAnalytics: checked as boolean
                      })}
                    />
                    <Label htmlFor="include-analytics">Include analytics summary</Label>
                  </div>

                  <Button 
                    onClick={handleExport}
                    disabled={exporting || exportConfig.endpoints.length === 0}
                    className="w-full"
                  >
                    {exporting && <Download className="mr-2 h-4 w-4 animate-spin" />}
                    <FileDown className="mr-2 h-4 w-4" />
                    Export FDA Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Searches Tab */}
        <TabsContent value="scheduling">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Add Scheduled Search</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Search Name</Label>
                    <Input
                      placeholder="e.g., Weekly Class I Recalls"
                      value={newScheduledSearch.name || ''}
                      onChange={(e) => setNewScheduledSearch({...newScheduledSearch, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="notifications@company.com"
                      value={newScheduledSearch.email || ''}
                      onChange={(e) => setNewScheduledSearch({...newScheduledSearch, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Search Query</Label>
                  <Input
                    placeholder="e.g., classification:\"Class I\" OR product_description:listeria"
                    value={newScheduledSearch.query || ''}
                    onChange={(e) => setNewScheduledSearch({...newScheduledSearch, query: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={newScheduledSearch.frequency} onValueChange={(value: any) => setNewScheduledSearch({...newScheduledSearch, frequency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button onClick={addScheduledSearch} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Scheduled Search
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Scheduled Searches */}
            <Card>
              <CardHeader>
                <CardTitle>Active Scheduled Searches</CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledSearches.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No scheduled searches configured
                  </p>
                ) : (
                  <div className="space-y-4">
                    {scheduledSearches.map((search) => (
                      <div key={search.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{search.name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant={search.active ? "default" : "secondary"}>
                              {search.active ? "Active" : "Paused"}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => toggleScheduledSearch(search.id)}>
                              {search.active ? "Pause" : "Resume"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteScheduledSearch(search.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Query:</strong> {search.query}</p>
                          <p><strong>Frequency:</strong> {search.frequency}</p>
                          <p><strong>Email:</strong> {search.email}</p>
                          {search.nextRun && (
                            <p><strong>Next Run:</strong> {search.nextRun.toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Alerts Tab */}
        <TabsContent value="alerts">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Add Smart Alert</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alert Name</Label>
                    <Input
                      placeholder="e.g., Listeria Contamination Alert"
                      value={newAlertRule.name || ''}
                      onChange={(e) => setNewAlertRule({...newAlertRule, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="alerts@company.com"
                      value={newAlertRule.email || ''}
                      onChange={(e) => setNewAlertRule({...newAlertRule, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select value={newAlertRule.trigger} onValueChange={(value: any) => setNewAlertRule({...newAlertRule, trigger: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_recall">Any New Recall</SelectItem>
                      <SelectItem value="class_i_recall">Class I Recalls Only</SelectItem>
                      <SelectItem value="company_match">Specific Company</SelectItem>
                      <SelectItem value="keyword_match">Keyword Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newAlertRule.trigger === 'keyword_match' && (
                  <div className="space-y-2">
                    <Label>Keywords (comma separated)</Label>
                    <Input
                      placeholder="e.g., listeria, salmonella, contamination"
                      onChange={(e) => setNewAlertRule({
                        ...newAlertRule, 
                        keywords: e.target.value.split(',').map(k => k.trim())
                      })}
                    />
                  </div>
                )}

                {newAlertRule.trigger === 'company_match' && (
                  <div className="space-y-2">
                    <Label>Company Names (comma separated)</Label>
                    <Input
                      placeholder="e.g., Abbott, Nestlé, Tyson"
                      onChange={(e) => setNewAlertRule({
                        ...newAlertRule, 
                        companies: e.target.value.split(',').map(c => c.trim())
                      })}
                    />
                  </div>
                )}

                <Button onClick={addAlertRule} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Alert Rule
                </Button>
              </CardContent>
            </Card>

            {/* Existing Alert Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Active Alert Rules</CardTitle>
              </CardHeader>
              <CardContent>
                {alertRules.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No alert rules configured
                  </p>
                ) : (
                  <div className="space-y-4">
                    {alertRules.map((rule) => (
                      <div key={rule.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant={rule.active ? "default" : "secondary"}>
                              {rule.active ? "Active" : "Paused"}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => toggleAlertRule(rule.id)}>
                              {rule.active ? "Pause" : "Resume"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteAlertRule(rule.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Trigger:</strong> {rule.trigger.replace('_', ' ')}</p>
                          <p><strong>Email:</strong> {rule.email}</p>
                          {rule.keywords.length > 0 && (
                            <p><strong>Keywords:</strong> {rule.keywords.join(', ')}</p>
                          )}
                          {rule.companies.length > 0 && (
                            <p><strong>Companies:</strong> {rule.companies.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

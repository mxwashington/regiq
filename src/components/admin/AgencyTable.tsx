// Agency Table Component
// Paginated table view for agencies with filtering and stats

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminFetch } from '@/hooks/useAdminFetch';
import { formatNumber, formatTimeAgo, formatSource } from '@/lib/format';
import { generateCSV, downloadCSV, generateFilename, CSVColumn } from '@/lib/csv';

interface Agency {
  id: string;
  name: string;
  source: string;
  website?: string;
  contact_email?: string;
  jurisdiction: string;
  product_types: string[];
  alert_count: number;
  last_alert_date: string | null;
  last_sync_success: string | null;
  last_sync_failure: string | null;
  sync_failures_24h: number;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

interface AgencyFilters {
  search: string;
  source: string;
  status: string;
  jurisdiction: string;
  page: string | number;
  pageSize: number;
}

interface AgencyResponse {
  agencies: Agency[];
  total: number;
  sources: string[];
  jurisdictions: string[];
}

const AGENCY_CSV_COLUMNS: CSVColumn<Agency>[] = [
  { key: 'name', header: 'Agency Name' },
  { key: 'source', header: 'Source' },
  { key: 'jurisdiction', header: 'Jurisdiction' },
  { key: 'product_types', header: 'Product Types', formatter: (value) => Array.isArray(value) ? value.join('; ') : '' },
  { key: 'alert_count', header: 'Total Alerts' },
  { key: 'last_alert_date', header: 'Last Alert', formatter: (value) => value ? new Date(value).toISOString().split('T')[0] : '' },
  { key: 'last_sync_success', header: 'Last Sync Success', formatter: (value) => value ? new Date(value).toISOString() : '' },
  { key: 'sync_failures_24h', header: 'Failures (24h)' },
  { key: 'status', header: 'Status' },
  { key: 'website', header: 'Website' },
  { key: 'contact_email', header: 'Contact Email' },
  { key: 'created_at', header: 'Created', formatter: (value) => new Date(value).toISOString() },
];

export function AgencyTable() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [filters, setFilters] = useState<AgencyFilters>({
    search: '',
    source: '',
    status: '',
    jurisdiction: '',
    page: 1,
    pageSize: 25,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { execute, loading } = useAdminFetch<AgencyResponse>();

  const loadAgencies = useCallback(async () => {
    const params = new URLSearchParams();

    if (filters.search) params.set('search', filters.search);
    if (filters.source) params.set('source', filters.source);
    if (filters.status) params.set('status', filters.status);
    if (filters.jurisdiction) params.set('jurisdiction', filters.jurisdiction);
    params.set('page', filters.page.toString());
    params.set('pageSize', filters.pageSize.toString());

    const data = await execute(`/api/admin/agencies?${params.toString()}`);
    if (data) {
      setAgencies(data.agencies);
      setTotal(data.total);
      setSources(data.sources);
      setJurisdictions(data.jurisdictions);
    }
  }, [execute, filters]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  const handleFilterChange = (key: keyof AgencyFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value, // Reset to page 1 when other filters change
    }));
  };

  const handleExportCSV = async () => {
    try {
      // Fetch all data for export (remove pagination)
      const exportParams = new URLSearchParams();
      if (filters.search) exportParams.set('search', filters.search);
      if (filters.source) exportParams.set('source', filters.source);
      if (filters.status) exportParams.set('status', filters.status);
      if (filters.jurisdiction) exportParams.set('jurisdiction', filters.jurisdiction);
      exportParams.set('pageSize', '10000'); // Large number to get all results

      const data = await execute(`/api/admin/agencies?${exportParams.toString()}`);
      if (data?.agencies) {
        const csv = generateCSV(data.agencies, AGENCY_CSV_COLUMNS);
        downloadCSV(csv, generateFilename('agencies_export'));
        toast.success(`Exported ${data.agencies.length} agencies to CSV`);
      }
    } catch (error) {
      toast.error('Failed to export agencies');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3" />;
      case 'inactive':
        return <Clock className="h-3 w-3" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Agencies</span>
          <Badge variant="outline">{formatNumber(total)}</Badge>
        </CardTitle>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Agency name..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Select
                value={filters.source}
                onValueChange={(value) => handleFilterChange('source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sources</SelectItem>
                  {sources.map(source => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Jurisdiction</label>
              <Select
                value={filters.jurisdiction}
                onValueChange={(value) => handleFilterChange('jurisdiction', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All jurisdictions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All jurisdictions</SelectItem>
                  {jurisdictions.map(jurisdiction => (
                    <SelectItem key={jurisdiction} value={jurisdiction}>
                      {jurisdiction}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Product Types</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Last Alert</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: filters.pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : agencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No agencies found
                  </TableCell>
                </TableRow>
              ) : (
                agencies.map(agency => {
                  const sourceConfig = formatSource(agency.source);
                  return (
                    <TableRow key={agency.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{agency.name}</div>
                          {agency.contact_email && (
                            <div className="text-xs text-muted-foreground">
                              {agency.contact_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={sourceConfig.color}>
                          {agency.source}
                        </Badge>
                      </TableCell>
                      <TableCell>{agency.jurisdiction}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {agency.product_types.slice(0, 2).map(type => (
                            <Badge key={type} variant="outline" className="mr-1 text-xs">
                              {type}
                            </Badge>
                          ))}
                          {agency.product_types.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{agency.product_types.length - 2} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="font-medium">{formatNumber(agency.alert_count)}</div>
                          {agency.sync_failures_24h > 0 && (
                            <div className="text-xs text-red-500">
                              {agency.sync_failures_24h} failures
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {agency.last_alert_date ? (
                          <div className="text-sm">
                            {formatTimeAgo(agency.last_alert_date)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(agency.status)} flex items-center space-x-1`}>
                          {getStatusIcon(agency.status)}
                          <span className="capitalize">{agency.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {agency.website && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <a
                              href={agency.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Visit website"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(Number(filters.page) - 1) * filters.pageSize + 1} to{' '}
              {Math.min(Number(filters.page) * filters.pageSize, total)} of {formatNumber(total)} agencies
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', Number(filters.page) - 1)}
                disabled={Number(filters.page) === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(
                    totalPages - 4,
                    Number(filters.page) - 2
                  )) + i;

                  if (pageNum > totalPages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === filters.page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handleFilterChange('page', pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', Number(filters.page) + 1)}
                disabled={Number(filters.page) === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
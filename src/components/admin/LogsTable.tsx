// Logs Table Component
// Comprehensive sync logs with filtering and real-time updates

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
  ScrollText,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminFetch } from '@/hooks/useAdminFetch';
import { formatTimeAgo, formatDuration, formatSource, formatNumber } from '@/lib/format';
import { generateCSV, downloadCSV, generateFilename, SYNC_LOGS_CSV_COLUMNS } from '@/lib/csv';

interface SyncLog {
  id: string;
  run_started: string;
  run_finished: string | null;
  source: string;
  status: 'success' | 'failure' | 'partial' | 'running';
  alerts_fetched: number;
  alerts_inserted: number;
  alerts_updated: number;
  alerts_skipped: number;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
  trigger_type: 'manual' | 'scheduled' | 'webhook';
  triggered_by?: string;
  created_at: string;
}

interface LogFilters {
  search: string;
  source: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  triggerType: string;
  page: number;
  pageSize: number;
}

interface LogsResponse {
  logs: SyncLog[];
  total: number;
  sources: string[];
  statuses: string[];
}

export function LogsTable() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    source: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    triggerType: '',
    page: 1,
    pageSize: 25,
  });

  const { execute, loading } = useAdminFetch<LogsResponse>();

  const loadLogs = useCallback(async () => {
    const params = new URLSearchParams();

    if (filters.search) params.set('search', filters.search);
    if (filters.source) params.set('source', filters.source);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.triggerType) params.set('triggerType', filters.triggerType);
    params.set('page', filters.page.toString());
    params.set('pageSize', filters.pageSize.toString());

    const data = await execute(`/api/admin/logs?${params.toString()}`);
    if (data) {
      setLogs(data.logs);
      setTotal(data.total);
      setSources(data.sources);
      setStatuses(data.statuses);
    }
  }, [execute, filters]);

  const handleFilterChange = (key: keyof LogFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value,
    }));
  };

  const handleExportCSV = async () => {
    try {
      const exportParams = new URLSearchParams();
      if (filters.search) exportParams.set('search', filters.search);
      if (filters.source) exportParams.set('source', filters.source);
      if (filters.status) exportParams.set('status', filters.status);
      if (filters.dateFrom) exportParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) exportParams.set('dateTo', filters.dateTo);
      if (filters.triggerType) exportParams.set('triggerType', filters.triggerType);
      exportParams.set('pageSize', '10000');

      const data = await execute(`/api/admin/logs?${exportParams.toString()}`);
      if (data?.logs) {
        const csv = generateCSV(data.logs, SYNC_LOGS_CSV_COLUMNS);
        downloadCSV(csv, generateFilename('sync_logs'));
        toast.success(`Exported ${data.logs.length} log entries to CSV`);
      }
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setAutoRefresh(false);
      toast.info('Auto-refresh disabled');
    } else {
      const interval = setInterval(loadLogs, 10000); // Refresh every 10 seconds
      setRefreshInterval(interval);
      setAutoRefresh(true);
      toast.info('Auto-refresh enabled (10s interval)');
    }
  };

  useEffect(() => {
    loadLogs();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [loadLogs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failure':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTriggerColor = (triggerType: string) => {
    switch (triggerType) {
      case 'manual':
        return 'bg-purple-100 text-purple-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'webhook':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDuration = (log: SyncLog) => {
    if (!log.run_finished) {
      return Date.now() - new Date(log.run_started).getTime();
    }
    return new Date(log.run_finished).getTime() - new Date(log.run_started).getTime();
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <ScrollText className="h-5 w-5" />
            <span>Sync Logs</span>
            <Badge variant="outline">{formatNumber(total)}</Badge>
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoRefresh}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? 'Auto' : 'Manual'}</span>
            </Button>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
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
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Trigger Type</label>
                <Select
                  value={filters.triggerType}
                  onValueChange={(value) => handleFilterChange('triggerType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All triggers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All triggers</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
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
                  <TableHead>Started</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Issues</TableHead>
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
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => {
                    const sourceConfig = formatSource(log.source);
                    const duration = calculateDuration(log);
                    const totalProcessed = log.alerts_inserted + log.alerts_updated + log.alerts_skipped;

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {formatTimeAgo(log.run_started)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(log.run_started).toLocaleString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={sourceConfig.color}>
                            {log.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(log.status)}
                            <Badge className={`${getStatusColor(log.status)} capitalize`}>
                              {log.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDuration(duration)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              {formatNumber(totalProcessed)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.alerts_inserted}+ {log.alerts_updated}↑ {log.alerts_skipped}→
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getTriggerColor(log.trigger_type)} capitalize`}>
                            {log.trigger_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {log.errors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {log.errors.length} errors
                              </Badge>
                            )}
                            {log.warnings.length > 0 && (
                              <Badge variant="outline" className="text-xs text-yellow-600">
                                {log.warnings.length} warnings
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-8 w-8 p-0"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                Showing {(filters.page - 1) * filters.pageSize + 1} to{' '}
                {Math.min(filters.page * filters.pageSize, total)} of {formatNumber(total)} logs
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                  disabled={filters.page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(
                      totalPages - 4,
                      filters.page - 2
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
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  disabled={filters.page === totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Log Details</span>
              <Badge className={`${getStatusColor(selectedLog.status)} capitalize`}>
                {selectedLog.status}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(null)}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium">Source</div>
                <div className="text-lg">{selectedLog.source}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Started</div>
                <div className="text-lg">{new Date(selectedLog.run_started).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Duration</div>
                <div className="text-lg">{formatDuration(calculateDuration(selectedLog))}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Trigger</div>
                <div className="text-lg capitalize">{selectedLog.trigger_type}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium">Fetched</div>
                <div className="text-lg font-bold text-blue-600">{formatNumber(selectedLog.alerts_fetched)}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Inserted</div>
                <div className="text-lg font-bold text-green-600">{formatNumber(selectedLog.alerts_inserted)}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Updated</div>
                <div className="text-lg font-bold text-yellow-600">{formatNumber(selectedLog.alerts_updated)}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Skipped</div>
                <div className="text-lg font-bold text-gray-600">{formatNumber(selectedLog.alerts_skipped)}</div>
              </div>
            </div>

            {selectedLog.errors.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Errors ({selectedLog.errors.length})</div>
                <div className="space-y-2">
                  {selectedLog.errors.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                      <code className="text-sm text-red-800 dark:text-red-200">{error}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedLog.warnings.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Warnings ({selectedLog.warnings.length})</div>
                <div className="space-y-2">
                  {selectedLog.warnings.map((warning, index) => (
                    <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
                      <code className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Metadata</div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border rounded-lg">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
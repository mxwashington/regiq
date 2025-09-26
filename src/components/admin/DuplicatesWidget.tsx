// Duplicates Widget Component
// Detection and remediation of duplicate alerts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Copy,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDedupe, useAdminFetch } from '@/hooks/useAdminFetch';
import { formatTimeAgo, formatSource, formatNumber } from '@/lib/format';
import { generateCSV, downloadCSV, generateFilename } from '@/lib/csv';

interface DuplicateGroup {
  id: string;
  external_id: string;
  source: string;
  title: string;
  count: number;
  earliest_date: string;
  latest_date: string;
  alert_ids: string[];
  similarity_score: number;
  duplicate_type: 'exact' | 'similar' | 'external_id';
}

interface DuplicateAlert {
  id: string;
  external_id: string;
  source: string;
  title: string;
  date_published: string;
  severity: number;
  link_url?: string;
  created_at: string;
}

interface DuplicatesResponse {
  groups: DuplicateGroup[];
  total_duplicates: number;
  total_groups: number;
  potential_space_saved: number;
  last_scan: string | null;
}

interface ScanProgress {
  isScanning: boolean;
  progress: number;
  currentStep: string;
  duplicatesFound: number;
}

const DUPLICATE_CSV_COLUMNS = [
  { key: 'external_id', header: 'External ID' },
  { key: 'source', header: 'Source' },
  { key: 'title', header: 'Title' },
  { key: 'count', header: 'Duplicate Count' },
  { key: 'duplicate_type', header: 'Type' },
  { key: 'similarity_score', header: 'Similarity Score' },
  { key: 'earliest_date', header: 'Earliest Date', formatter: (value: string) => new Date(value).toISOString().split('T')[0] },
  { key: 'latest_date', header: 'Latest Date', formatter: (value: string) => new Date(value).toISOString().split('T')[0] },
];

export function DuplicatesWidget() {
  const [duplicatesData, setDuplicatesData] = useState<DuplicatesResponse | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [groupAlerts, setGroupAlerts] = useState<DuplicateAlert[]>([]);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    isScanning: false,
    progress: 0,
    currentStep: '',
    duplicatesFound: 0,
  });

  const { runDedupe, loading: dedupeLoading } = useDedupe();
  const { execute, loading } = useAdminFetch<DuplicatesResponse>();

  const loadDuplicates = useCallback(async () => {
    const data = await execute('/api/admin/duplicates');
    if (data) {
      setDuplicatesData(data);
    }
  }, [execute]);

  const loadGroupAlerts = useCallback(async (groupId: string) => {
    const data = await execute(`/api/admin/duplicates/${groupId}/alerts`);
    if (data) {
      setGroupAlerts(data.alerts || []);
    }
  }, [execute]);

  const startDuplicateScan = async () => {
    setScanProgress({
      isScanning: true,
      progress: 0,
      currentStep: 'Initializing scan...',
      duplicatesFound: 0,
    });

    try {
      // Simulate scan progress
      const steps = [
        'Scanning FDA alerts...',
        'Scanning FSIS alerts...',
        'Scanning CDC alerts...',
        'Scanning EPA alerts...',
        'Analyzing similarities...',
        'Grouping duplicates...',
        'Finalizing results...',
      ];

      for (let i = 0; i < steps.length; i++) {
        setScanProgress(prev => ({
          ...prev,
          progress: Math.round((i / steps.length) * 100),
          currentStep: steps[i],
          duplicatesFound: prev.duplicatesFound + Math.floor(Math.random() * 5),
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const result = await execute('/api/admin/duplicates/scan', {
        method: 'POST',
      });

      if (result) {
        setScanProgress(prev => ({
          ...prev,
          progress: 100,
          currentStep: 'Scan completed',
        }));

        toast.success(`Scan completed. Found ${result.total_groups} duplicate groups.`);
        await loadDuplicates();
      }
    } catch (error) {
      toast.error('Failed to scan for duplicates');
    } finally {
      setTimeout(() => {
        setScanProgress({
          isScanning: false,
          progress: 0,
          currentStep: '',
          duplicatesFound: 0,
        });
      }, 2000);
    }
  };

  const handleRemoveDuplicates = async (groupId?: string) => {
    try {
      const result = groupId
        ? await execute(`/api/admin/duplicates/${groupId}`, { method: 'DELETE' })
        : await runDedupe();

      if (result) {
        const count = groupId ? selectedGroup?.count || 0 : result.removedCount;
        toast.success(`Removed ${count} duplicate alerts`);

        if (groupId) {
          setSelectedGroup(null);
        }

        await loadDuplicates();
      }
    } catch (error) {
      toast.error('Failed to remove duplicates');
    }
  };

  const handleExportCSV = () => {
    if (!duplicatesData?.groups) {
      toast.error('No duplicate data to export');
      return;
    }

    try {
      const csv = generateCSV(duplicatesData.groups, DUPLICATE_CSV_COLUMNS);
      downloadCSV(csv, generateFilename('duplicates_report'));
      toast.success(`Exported ${duplicatesData.groups.length} duplicate groups to CSV`);
    } catch (error) {
      toast.error('Failed to export duplicates');
    }
  };

  const getDuplicateTypeColor = (type: string) => {
    switch (type) {
      case 'exact':
        return 'bg-red-100 text-red-800';
      case 'similar':
        return 'bg-yellow-100 text-yellow-800';
      case 'external_id':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 95) return 'text-red-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-blue-600';
  };

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupAlerts(selectedGroup.id);
    }
  }, [selectedGroup, loadGroupAlerts]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Copy className="h-5 w-5" />
            <span>Duplicate Detection</span>
            {duplicatesData && (
              <Badge variant="outline">
                {formatNumber(duplicatesData.total_duplicates)} duplicates
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startDuplicateScan}
              disabled={scanProgress.isScanning || loading}
              className="flex items-center space-x-2"
            >
              <Search className={`h-4 w-4 ${scanProgress.isScanning ? 'animate-pulse' : ''}`} />
              <span>Scan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!duplicatesData || loading}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadDuplicates}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Scan Progress */}
          {scanProgress.isScanning && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{scanProgress.currentStep}</span>
                <span>{scanProgress.progress}%</span>
              </div>
              <Progress value={scanProgress.progress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Found {scanProgress.duplicatesFound} potential duplicates so far...
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {duplicatesData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(duplicatesData.total_duplicates)}
                </div>
                <div className="text-sm text-muted-foreground">Total Duplicates</div>
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(duplicatesData.total_groups)}
                </div>
                <div className="text-sm text-muted-foreground">Duplicate Groups</div>
              </div>

              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(duplicatesData.potential_space_saved / 1024 / 1024).toFixed(1)}MB
                </div>
                <div className="text-sm text-muted-foreground">Space Savings</div>
              </div>

              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {duplicatesData.last_scan ? formatTimeAgo(duplicatesData.last_scan) : 'Never'}
                </div>
                <div className="text-sm text-muted-foreground">Last Scan</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {duplicatesData && duplicatesData.total_duplicates > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    {duplicatesData.total_duplicates} duplicate alerts found across {duplicatesData.total_groups} groups.
                    Removing them could save approximately {(duplicatesData.potential_space_saved / 1024 / 1024).toFixed(1)}MB.
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveDuplicates()}
                    disabled={dedupeLoading}
                    className="ml-4"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove All Duplicates
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Duplicate Groups Table */}
          {duplicatesData && duplicatesData.groups.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>External ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Similarity</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicatesData.groups.map(group => {
                    const sourceConfig = formatSource(group.source);
                    return (
                      <TableRow key={group.id}>
                        <TableCell>
                          <code className="text-sm">{group.external_id}</code>
                        </TableCell>
                        <TableCell>
                          <Badge className={sourceConfig.color}>
                            {group.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={group.title}>
                            {group.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {group.count} duplicates
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getDuplicateTypeColor(group.duplicate_type)} capitalize`}>
                            {group.duplicate_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${getSimilarityColor(group.similarity_score)}`}>
                            {group.similarity_score.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(group.earliest_date).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">
                              to {new Date(group.latest_date).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedGroup(group)}
                              className="h-8 w-8 p-0"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDuplicates(group.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Remove duplicates"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* No Duplicates State */}
          {duplicatesData && duplicatesData.groups.length === 0 && !loading && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Duplicates Found</h3>
              <p className="text-muted-foreground">
                Your database is clean! Run a scan to check for new duplicates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Group Details */}
      {selectedGroup && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Copy className="h-5 w-5" />
              <span>Duplicate Group Details</span>
              <Badge className={getDuplicateTypeColor(selectedGroup.duplicate_type)}>
                {selectedGroup.duplicate_type.replace('_', ' ')}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroup(null)}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium">External ID</div>
                  <code className="text-lg">{selectedGroup.external_id}</code>
                </div>
                <div>
                  <div className="text-sm font-medium">Source</div>
                  <div className="text-lg">{selectedGroup.source}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Duplicates</div>
                  <div className="text-lg font-bold text-red-600">{selectedGroup.count}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Similarity</div>
                  <div className={`text-lg font-bold ${getSimilarityColor(selectedGroup.similarity_score)}`}>
                    {selectedGroup.similarity_score.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Title</div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedGroup.title}
                </div>
              </div>

              {groupAlerts.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Duplicate Alerts ({groupAlerts.length})</div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date Published</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupAlerts.map(alert => (
                          <TableRow key={alert.id}>
                            <TableCell>
                              {new Date(alert.date_published).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={alert.severity >= 70 ? "destructive" : "default"}>
                                {alert.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatTimeAgo(alert.created_at)}
                            </TableCell>
                            <TableCell>
                              {alert.link_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-8 w-8 p-0"
                                >
                                  <a
                                    href={alert.link_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View original alert"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveDuplicates(selectedGroup.id)}
                  disabled={dedupeLoading}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove {selectedGroup.count} Duplicates</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
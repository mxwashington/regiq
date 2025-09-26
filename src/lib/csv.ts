// CSV Export Utilities
// Safe CSV generation and download functionality

export interface CSVColumn<T = any> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string;
}

export function generateCSV<T>(data: T[], columns: CSVColumn<T>[]): string {
  if (data.length === 0) {
    return columns.map(col => col.header).join(',');
  }

  // Helper function to escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';

    const str = String(value);

    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  };

  // Generate header row
  const headers = columns.map(col => escapeCSV(col.header)).join(',');

  // Generate data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = getNestedValue(row, col.key as string);
      const formattedValue = col.formatter ? col.formatter(value, row) : value;
      return escapeCSV(formattedValue);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

// Predefined column sets for common exports
export const ALERTS_CSV_COLUMNS: CSVColumn[] = [
  { key: 'date_published', header: 'Date Published', formatter: (value) => new Date(value).toISOString().split('T')[0] },
  { key: 'source', header: 'Source' },
  { key: 'title', header: 'Title' },
  { key: 'category', header: 'Category' },
  { key: 'severity', header: 'Severity' },
  { key: 'external_id', header: 'External ID' },
  { key: 'summary', header: 'Summary' },
  { key: 'jurisdiction', header: 'Jurisdiction' },
  { key: 'locations', header: 'Locations', formatter: (value) => Array.isArray(value) ? value.join('; ') : '' },
  { key: 'product_types', header: 'Product Types', formatter: (value) => Array.isArray(value) ? value.join('; ') : '' },
  { key: 'link_url', header: 'Link URL' },
  { key: 'created_at', header: 'Created At', formatter: (value) => new Date(value).toISOString() },
];

export const SYNC_LOGS_CSV_COLUMNS: CSVColumn[] = [
  { key: 'run_started', header: 'Run Started', formatter: (value) => new Date(value).toISOString() },
  { key: 'source', header: 'Source' },
  { key: 'status', header: 'Status' },
  { key: 'alerts_fetched', header: 'Fetched' },
  { key: 'alerts_inserted', header: 'Inserted' },
  { key: 'alerts_updated', header: 'Updated' },
  { key: 'alerts_skipped', header: 'Skipped' },
  { key: 'errors', header: 'Errors', formatter: (value) => Array.isArray(value) ? value.length.toString() : '0' },
  { key: 'run_finished', header: 'Run Finished', formatter: (value) => value ? new Date(value).toISOString() : '' },
  {
    key: 'duration',
    header: 'Duration (seconds)',
    formatter: (value, row) => {
      if (!row.run_finished || !row.run_started) return '';
      const duration = (new Date(row.run_finished).getTime() - new Date(row.run_started).getTime()) / 1000;
      return duration.toFixed(2);
    }
  },
];

export const HEALTH_CSV_COLUMNS: CSVColumn[] = [
  { key: 'name', header: 'Source' },
  { key: 'status', header: 'Status' },
  { key: 'latency', header: 'Latency (ms)' },
  { key: 'message', header: 'Message' },
  { key: 'lastChecked', header: 'Last Checked', formatter: (value) => new Date(value).toISOString() },
];

// Utility to generate filename with timestamp
export function generateFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return `${prefix}_${timestamp}.${extension}`;
}

// Batch CSV generation for large datasets
export async function generateLargeCSV<T>(
  data: T[],
  columns: CSVColumn<T>[],
  chunkSize: number = 1000,
  onProgress?: (progress: number) => void
): Promise<string> {
  const headers = columns.map(col => col.header).join(',');
  let csv = headers + '\n';

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const chunkCSV = generateCSV(chunk, columns);
    // Skip headers for chunks after the first
    const chunkRows = chunkCSV.split('\n').slice(1);
    csv += chunkRows.join('\n') + '\n';

    if (onProgress) {
      onProgress((i + chunk.length) / data.length);
    }

    // Allow UI to update between chunks
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return csv;
}
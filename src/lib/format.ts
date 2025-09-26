// Formatting Utilities
// Date, severity, category, and other data formatting helpers

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

// Date formatting
export function formatDate(date: string | Date, pattern: string = 'MMM dd, yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, pattern);
  } catch {
    return 'Invalid date';
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
}

export function formatTimeAgo(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Unknown';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

// Severity formatting
export function formatSeverity(severity: number | null): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (severity === null || severity === undefined) {
    return {
      label: 'Unknown',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    };
  }

  if (severity >= 80) {
    return {
      label: 'Critical',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    };
  } else if (severity >= 60) {
    return {
      label: 'High',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
    };
  } else if (severity >= 40) {
    return {
      label: 'Medium',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
    };
  } else {
    return {
      label: 'Low',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    };
  }
}

// Category formatting
export function formatCategory(category: string | null): {
  label: string;
  color: string;
  bgColor: string;
} {
  const categoryLower = category?.toLowerCase() || 'unknown';

  switch (categoryLower) {
    case 'recall':
      return {
        label: 'Recall',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
      };
    case 'outbreak':
      return {
        label: 'Outbreak',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
      };
    case 'enforcement':
      return {
        label: 'Enforcement',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      };
    case 'advisory':
    case 'guidance':
      return {
        label: 'Advisory',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
      };
    default:
      return {
        label: category || 'Unknown',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
      };
  }
}

// Source formatting
export function formatSource(source: string): {
  label: string;
  fullName: string;
  color: string;
  bgColor: string;
} {
  switch (source) {
    case 'FDA':
      return {
        label: 'FDA',
        fullName: 'Food & Drug Administration',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      };
    case 'FSIS':
      return {
        label: 'FSIS',
        fullName: 'USDA Food Safety & Inspection Service',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      };
    case 'CDC':
      return {
        label: 'CDC',
        fullName: 'Centers for Disease Control',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
      };
    case 'EPA':
      return {
        label: 'EPA',
        fullName: 'Environmental Protection Agency',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
      };
    default:
      return {
        label: source,
        fullName: source,
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
      };
  }
}

// Status formatting
export function formatSyncStatus(status: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success':
      return {
        label: 'Success',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      };
    case 'failed':
    case 'error':
      return {
        label: 'Failed',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
      };
    case 'running':
    case 'in_progress':
      return {
        label: 'Running',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      };
    case 'partial':
      return {
        label: 'Partial',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
      };
    default:
      return {
        label: status || 'Unknown',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
      };
  }
}

// Number formatting
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat().format(num);
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// URL/External ID formatting
export function formatExternalId(externalId: string, maxLength: number = 20): string {
  if (externalId.length <= maxLength) return externalId;
  return `${externalId.substring(0, maxLength - 3)}...`;
}

export function formatUrl(url: string | null, maxLength: number = 50): string {
  if (!url) return 'N/A';
  if (url.length <= maxLength) return url;
  return `${url.substring(0, maxLength - 3)}...`;
}

// Health status formatting
export function formatHealthStatus(status: string): {
  label: string;
  color: string;
  bgColor: string;
  icon: '🟢' | '🟡' | '🔴';
} {
  switch (status?.toLowerCase()) {
    case 'healthy':
    case 'up':
    case 'online':
      return {
        label: 'Healthy',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: '🟢',
      };
    case 'unhealthy':
    case 'down':
    case 'offline':
    case 'error':
      return {
        label: 'Unhealthy',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: '🔴',
      };
    case 'timeout':
    case 'slow':
    case 'degraded':
      return {
        label: 'Degraded',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: '🟡',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        icon: '🟡',
      };
  }
}
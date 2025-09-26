// Admin Error Handling
// Comprehensive error handling and validation for admin operations

import { toast } from 'sonner';

export class AdminError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface AdminOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  statusCode?: number;
}

// API Error Handler
export function handleApiError(error: any): AdminOperationResult {
  console.error('Admin API Error:', error);

  if (error instanceof AdminError) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500,
    };
  }

  if (error.response) {
    // HTTP error response
    const statusCode = error.response.status;
    const message = error.response.data?.error || error.response.statusText || 'Unknown error';

    return {
      success: false,
      error: message,
      statusCode,
    };
  }

  if (error.message) {
    return {
      success: false,
      error: error.message,
      statusCode: 500,
    };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    statusCode: 500,
  };
}

// Toast Error Handler
export function showError(error: any, defaultMessage = 'An error occurred') {
  const result = handleApiError(error);

  if (result.statusCode === 401) {
    toast.error('Unauthorized: Admin access required');
    // Optionally redirect to login
    window.location.href = '/auth/login?redirect=/admin';
    return;
  }

  if (result.statusCode === 403) {
    toast.error('Forbidden: Insufficient permissions');
    return;
  }

  if (result.statusCode === 429) {
    toast.error('Rate limit exceeded. Please try again later.');
    return;
  }

  toast.error(result.error || defaultMessage);
}

// Validation Helpers
export function validateEmail(email: string): ValidationError | null {
  if (!email || !email.trim()) {
    return { field: 'email', message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'Invalid email format' };
  }

  return null;
}

export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === null || value === undefined || value === '') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
}

export function validateNumber(
  value: any,
  fieldName: string,
  min?: number,
  max?: number
): ValidationError | null {
  if (isNaN(Number(value))) {
    return { field: fieldName, message: `${fieldName} must be a valid number` };
  }

  const num = Number(value);

  if (min !== undefined && num < min) {
    return { field: fieldName, message: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { field: fieldName, message: `${fieldName} must be at most ${max}` };
  }

  return null;
}

export function validateUrl(url: string, fieldName = 'URL'): ValidationError | null {
  if (!url || !url.trim()) {
    return null; // URL is optional in most cases
  }

  try {
    new URL(url);
    return null;
  } catch {
    return { field: fieldName.toLowerCase(), message: `${fieldName} must be a valid URL` };
  }
}

export function validateCronExpression(cron: string): ValidationError | null {
  if (!cron || !cron.trim()) {
    return { field: 'cron', message: 'Cron expression is required' };
  }

  // Basic cron validation (5 parts)
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { field: 'cron', message: 'Cron expression must have 5 parts (minute hour day month weekday)' };
  }

  return null;
}

// Form Validation
export function validateAdminUserForm(data: {
  email: string;
  role: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  const roleError = validateRequired(data.role, 'role');
  if (roleError) errors.push(roleError);

  if (data.role && !['viewer', 'admin', 'super_admin'].includes(data.role)) {
    errors.push({ field: 'role', message: 'Invalid role selected' });
  }

  return errors;
}

export function validateSystemConfig(config: {
  sync_schedule: string;
  max_alerts_per_sync: number;
  retention_days: number;
  rate_limit_per_hour: number;
  webhook_url?: string;
  notification_email?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const cronError = validateCronExpression(config.sync_schedule);
  if (cronError) errors.push(cronError);

  const maxAlertsError = validateNumber(config.max_alerts_per_sync, 'max_alerts_per_sync', 1, 10000);
  if (maxAlertsError) errors.push(maxAlertsError);

  const retentionError = validateNumber(config.retention_days, 'retention_days', 1, 3650);
  if (retentionError) errors.push(retentionError);

  const rateLimitError = validateNumber(config.rate_limit_per_hour, 'rate_limit_per_hour', 1, 100000);
  if (rateLimitError) errors.push(rateLimitError);

  if (config.webhook_url) {
    const webhookError = validateUrl(config.webhook_url, 'webhook_url');
    if (webhookError) errors.push(webhookError);
  }

  if (config.notification_email) {
    const emailError = validateEmail(config.notification_email);
    if (emailError) {
      errors.push({ ...emailError, field: 'notification_email' });
    }
  }

  return errors;
}

export function validateRLSPolicy(policy: {
  policy_name: string;
  table_name: string;
  expression: string;
  policy_type: string;
  command_type: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(policy.policy_name, 'policy_name');
  if (nameError) errors.push(nameError);

  const tableError = validateRequired(policy.table_name, 'table_name');
  if (tableError) errors.push(tableError);

  const expressionError = validateRequired(policy.expression, 'expression');
  if (expressionError) errors.push(expressionError);

  if (!['permissive', 'restrictive'].includes(policy.policy_type)) {
    errors.push({ field: 'policy_type', message: 'Invalid policy type' });
  }

  if (!['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(policy.command_type)) {
    errors.push({ field: 'command_type', message: 'Invalid command type' });
  }

  // Basic SQL injection protection
  const dangerousPatterns = [
    /;\s*drop\s+table/i,
    /;\s*delete\s+from/i,
    /;\s*update\s+.*\s+set/i,
    /;\s*insert\s+into/i,
    /--\s*$/,
    /\/\*.*\*\//,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(policy.expression)) {
      errors.push({ field: 'expression', message: 'Policy expression contains potentially dangerous SQL' });
      break;
    }
  }

  return errors;
}

// Retry Logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

// Operation State Management
export interface OperationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function createOperationState(): OperationState {
  return {
    loading: false,
    error: null,
    success: false,
  };
}

export function setOperationLoading(state: OperationState): OperationState {
  return {
    loading: true,
    error: null,
    success: false,
  };
}

export function setOperationSuccess(state: OperationState): OperationState {
  return {
    loading: false,
    error: null,
    success: true,
  };
}

export function setOperationError(state: OperationState, error: string): OperationState {
  return {
    loading: false,
    error,
    success: false,
  };
}

// Security Helpers
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function validateFileUpload(file: File, allowedTypes: string[], maxSize: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    });
  }

  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
    });
  }

  return errors;
}

// Rate Limiting Check
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const storageKey = `rateLimit_${key}`;

  try {
    const stored = localStorage.getItem(storageKey);
    const requests = stored ? JSON.parse(stored) : [];

    // Filter out old requests
    const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);

    if (recentRequests.length >= limit) {
      return false; // Rate limit exceeded
    }

    // Add current request
    recentRequests.push(now);
    localStorage.setItem(storageKey, JSON.stringify(recentRequests));

    return true;
  } catch {
    // If localStorage fails, allow the request
    return true;
  }
}
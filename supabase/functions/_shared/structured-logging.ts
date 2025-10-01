/**
 * Structured Logging Utility
 *
 * Provides comprehensive error logging to database for observability.
 * Logs errors with severity levels, context, and full stack traces.
 *
 * Features:
 * - Severity-based logging (info, warning, error, critical)
 * - Automatic severity detection based on error type
 * - Database persistence for historical analysis
 * - Never crashes on logging failures (fail-safe)
 * - Rich context tracking for debugging
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface LogContext {
  function_name: string;
  endpoint?: string;
  attempt?: number;
  willRetry?: boolean;
  statusCode?: number;
  [key: string]: any;
}

/**
 * Logs structured error to database for observability
 *
 * @param error - Error object to log
 * @param context - Additional context about the error
 */
export async function logStructuredError(
  error: Error,
  context: LogContext
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const severity = determineSeverity(error, context);

    // Insert error log to database
    const { error: insertError } = await supabase
      .from('error_logs')
      .insert({
        function_name: context.function_name,
        error_type: error.constructor.name,
        error_message: error.message,
        error_stack: error.stack,
        context: context,
        severity: severity
      });

    if (insertError) {
      console.error('[Structured Logging] Failed to insert error log:', insertError);
    }

    // Also log to console for debugging
    console.error(
      `[${context.function_name}] ${severity.toUpperCase()}: ${error.message}`,
      context
    );

  } catch (loggingError) {
    // Never let logging errors crash the application
    console.error('[Structured Logging] Logging failed:', loggingError);
  }
}

/**
 * Determines severity based on error type and context
 *
 * Severity levels:
 * - INFO: Successful operations, informational messages
 * - WARNING: Recoverable errors, will retry
 * - ERROR: Failed operations, fallback attempted
 * - CRITICAL: Complete failures, data freshness issues
 */
function determineSeverity(error: Error, context: LogContext): Severity {
  // NoResultsError = critical (data freshness issue)
  if (error.name === 'NoResultsError') {
    return 'critical';
  }

  // 500+ errors = critical (upstream service down)
  if (error.name === 'FDAAPIError' && context.statusCode && context.statusCode >= 500) {
    return 'critical';
  }

  // Will retry = warning (transient issue)
  if (context.willRetry) {
    return 'warning';
  }

  // RSS parse errors = error (fallback failed)
  if (error.name === 'RSSParseError') {
    return 'error';
  }

  // 429 (rate limit) = warning if will retry, error otherwise
  if (error.name === 'FDAAPIError' && context.statusCode === 429) {
    return context.willRetry ? 'warning' : 'error';
  }

  // Default to error
  return 'error';
}

/**
 * Logs informational message (successful operations)
 *
 * Use this for tracking successful data fetches, sync completions, etc.
 *
 * @param functionName - Name of the function
 * @param message - Success message
 * @param context - Additional context
 */
export async function logInfo(
  functionName: string,
  message: string,
  context: Record<string, any> = {}
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('error_logs').insert({
      function_name: functionName,
      error_type: 'INFO',
      error_message: message,
      context: context,
      severity: 'info'
    });

    console.log(`[${functionName}] ${message}`, context);

  } catch (error) {
    console.error('[Structured Logging] Failed to log info:', error);
  }
}

/**
 * Logs warning message (recoverable issues)
 *
 * Use this for situations that aren't ideal but don't prevent operation.
 *
 * @param functionName - Name of the function
 * @param message - Warning message
 * @param context - Additional context
 */
export async function logWarning(
  functionName: string,
  message: string,
  context: Record<string, any> = {}
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('error_logs').insert({
      function_name: functionName,
      error_type: 'WARNING',
      error_message: message,
      context: context,
      severity: 'warning'
    });

    console.warn(`[${functionName}] WARNING: ${message}`, context);

  } catch (error) {
    console.error('[Structured Logging] Failed to log warning:', error);
  }
}

/**
 * Logs critical alert (requires immediate attention)
 *
 * Use this for complete failures that affect data freshness.
 *
 * @param functionName - Name of the function
 * @param message - Critical error message
 * @param context - Additional context
 */
export async function logCritical(
  functionName: string,
  message: string,
  context: Record<string, any> = {}
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('error_logs').insert({
      function_name: functionName,
      error_type: 'CRITICAL',
      error_message: message,
      context: context,
      severity: 'critical'
    });

    console.error(`[${functionName}] 🚨 CRITICAL: ${message}`, context);

  } catch (error) {
    console.error('[Structured Logging] Failed to log critical:', error);
  }
}

/**
 * Query recent errors for a specific function
 *
 * Useful for health checks and debugging
 */
export async function getRecentErrors(
  functionName: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .eq('function_name', functionName)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Structured Logging] Failed to query errors:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('[Structured Logging] Failed to query errors:', error);
    return [];
  }
}

/**
 * Get error statistics for a function over a time period
 *
 * @param functionName - Name of the function
 * @param hours - Time period in hours (default: 24)
 */
export async function getErrorStats(
  functionName: string,
  hours: number = 24
): Promise<{
  total: number;
  by_severity: Record<Severity, number>;
  by_error_type: Record<string, number>;
}> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const { data, error } = await supabase
      .from('error_logs')
      .select('severity, error_type')
      .eq('function_name', functionName)
      .gte('created_at', cutoffTime.toISOString());

    if (error || !data) {
      return {
        total: 0,
        by_severity: { info: 0, warning: 0, error: 0, critical: 0 },
        by_error_type: {}
      };
    }

    const by_severity: Record<Severity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    };

    const by_error_type: Record<string, number> = {};

    for (const log of data) {
      by_severity[log.severity as Severity]++;
      by_error_type[log.error_type] = (by_error_type[log.error_type] || 0) + 1;
    }

    return {
      total: data.length,
      by_severity,
      by_error_type
    };

  } catch (error) {
    console.error('[Structured Logging] Failed to get error stats:', error);
    return {
      total: 0,
      by_severity: { info: 0, warning: 0, error: 0, critical: 0 },
      by_error_type: {}
    };
  }
}

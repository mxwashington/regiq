// Centralized error logging utility for all edge functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface ErrorLogContext {
  function_name: string;
  error: Error | string;
  context?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export async function logError(config: ErrorLogContext): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[ERROR-LOGGER] Missing Supabase credentials');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const errorMessage = config.error instanceof Error ? config.error.message : String(config.error);
    const errorStack = config.error instanceof Error ? config.error.stack : undefined;

    await supabase.from('error_logs').insert({
      function_name: config.function_name,
      error_message: errorMessage,
      error_stack: errorStack,
      context: config.context || {},
      severity: config.severity || 'error'
    });

    console.error(`[${config.function_name}] ${errorMessage}`, config.context);
  } catch (logError) {
    console.error('[ERROR-LOGGER] Failed to log error:', logError);
  }
}

export async function logHealthCheck(
  api_name: string,
  endpoint: string,
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error',
  response_time_ms?: number,
  status_code?: number,
  error_message?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[HEALTH-LOGGER] Missing Supabase credentials');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('api_health_checks').insert({
      api_name,
      endpoint,
      status,
      response_time_ms,
      status_code,
      error_message,
      metadata: metadata || {}
    });
  } catch (logError) {
    console.error('[HEALTH-LOGGER] Failed to log health check:', logError);
  }
}

// Retry logic with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  functionName: string = 'unknown'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`[${functionName}] Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        await logError({
          function_name: functionName,
          error: lastError,
          context: { attempts: maxRetries, final_attempt: true },
          severity: 'error'
        });
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}
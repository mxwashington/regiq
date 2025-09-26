
/**
 * Centralized logging utility
 * Provides debug, info, warn, error logging levels
 * Automatically disabled in production builds
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Remove sensitive information
    const sensitiveKeys = [
      'password', 'token', 'key', 'secret', 'auth', 'authorization',
      'session', 'cookie', 'email', 'phone', 'ssn', 'credit_card',
      'api_key', 'access_token', 'refresh_token', 'bearer',
      'user_id', 'id', 'uuid'
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sensitive => 
          lowerKey.includes(sensitive) || 
          (typeof value === 'string' && value.length > 20 && /^[a-zA-Z0-9+/=_-]+$/.test(value))
        );
        
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    return sanitize(data);
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: new Date().toISOString(),
      context
    };

    this.addToHistory(entry);

    const prefix = `[${level.toUpperCase()}]${context ? ` [${context}]` : ''} ${entry.timestamp}:`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ? entry.data : '');
        break;
      case 'info':
        console.info(prefix, message, data ? entry.data : '');
        break;
      case 'warn':
        console.warn(prefix, message, data ? entry.data : '');
        break;
      case 'error':
        console.error(prefix, message, data ? entry.data : '');
        break;
    }
  }

  debug(message: string, data?: any, context?: string): void {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: any, context?: string): void {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string): void {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string): void {
    this.log('error', message, data, context);
  }

  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for usage
export type { LogLevel, LogEntry };
// Input sanitization and validation for regulatory search queries and data
// Prevents SQL injection, XSS, and other injection attacks

export interface ValidationRule {
  type: 'length' | 'pattern' | 'whitelist' | 'sanitize';
  config: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    whitelist?: string[];
    sanitizer?: (input: string) => string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

export class RegulatoryInputSanitizer {
  // Common dangerous patterns to detect
  private static readonly DANGEROUS_PATTERNS = [
    // SQL injection patterns
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b|\bOR\b\s+1\s*=\s*1|\bAND\b\s+1\s*=\s*1)/i,
    // Script injection
    /<script[^>]*>.*?<\/script>/gi,
    // HTML injection
    /<\s*\/?\s*(script|iframe|object|embed|form|input|meta|link)/gi,
    // JavaScript protocol
    /javascript\s*:/gi,
    // Data URLs that could contain scripts
    /data\s*:\s*[^,]*script/gi,
    // SQL comments
    /(--|\/\*|\*\/)/,
    // Path traversal
    /\.\.[\/\\]/,
  ];

  // Whitelist for regulatory search terms
  private static readonly REGULATORY_TERMS_WHITELIST = [
    // Agencies
    'fda', 'usda', 'epa', 'osha', 'cdc', 'fsis', 'who', 'health canada',
    // Common regulatory terms
    'recall', 'alert', 'inspection', 'violation', 'enforcement', 'compliance',
    'haccp', 'gmp', 'food safety', 'drug safety', 'medical device',
    'pathogen', 'contamination', 'outbreak', 'advisory', 'guidance',
    // Product categories
    'food', 'pharmaceutical', 'medical device', 'cosmetic', 'dietary supplement',
    'meat', 'poultry', 'seafood', 'produce', 'dairy', 'beverage',
    // Urgency levels
    'critical', 'high', 'medium', 'low', 'urgent', 'immediate'
  ];

  static sanitizeSearchQuery(input: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = input;

    // Check length
    if (!input || input.trim().length === 0) {
      return {
        isValid: false,
        sanitizedValue: '',
        errors: ['Search query cannot be empty']
      };
    }

    if (input.length > 500) {
      errors.push('Search query too long (max 500 characters)');
      sanitized = sanitized.substring(0, 500);
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        errors.push('Invalid characters or patterns detected in search query');
        // Remove dangerous content
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // HTML encode special characters
    sanitized = this.htmlEncode(sanitized);

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Ensure minimum length after sanitization
    if (sanitized.length < 2) {
      errors.push('Search query too short after sanitization (min 2 characters)');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  }

  static sanitizeSupplierName(input: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = input;

    if (!input || input.trim().length === 0) {
      return {
        isValid: false,
        sanitizedValue: '',
        errors: ['Supplier name cannot be empty']
      };
    }

    // Length validation
    if (input.length > 200) {
      errors.push('Supplier name too long (max 200 characters)');
      sanitized = sanitized.substring(0, 200);
    }

    // Only allow alphanumeric, spaces, common business punctuation
    const allowedPattern = /^[a-zA-Z0-9\s\.,&\-\(\)Inc\.LLCCorpLtd]*$/;
    if (!allowedPattern.test(sanitized)) {
      errors.push('Supplier name contains invalid characters');
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s\.,&\-\(\)]/g, '');
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        errors.push('Invalid patterns detected in supplier name');
        sanitized = sanitized.replace(pattern, '');
      }
    }

    sanitized = this.htmlEncode(sanitized).trim();

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  }

  static sanitizeFilterValue(input: any, fieldType: 'text' | 'select' | 'multiselect' | 'date'): ValidationResult {
    const errors: string[] = [];
    let sanitized = String(input || '');

    switch (fieldType) {
      case 'text':
        return this.sanitizeSearchQuery(sanitized);
      
      case 'select':
      case 'multiselect':
        // For selects, ensure value is from predefined options
        if (sanitized && !this.isValidSelectOption(sanitized)) {
          errors.push('Invalid selection option');
          sanitized = '';
        }
        break;
        
      case 'date':
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (sanitized && !dateRegex.test(sanitized)) {
          errors.push('Invalid date format (expected YYYY-MM-DD)');
          sanitized = '';
        }
        
        // Check for reasonable date range
        if (sanitized) {
          const date = new Date(sanitized);
          const now = new Date();
          const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
          const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          
          if (date < twoYearsAgo || date > oneYearAhead) {
            errors.push('Date must be within reasonable range (last 2 years to next year)');
            sanitized = '';
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  }

  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = email.trim().toLowerCase();

    if (!sanitized) {
      return {
        isValid: false,
        sanitizedValue: '',
        errors: ['Email is required']
      };
    }

    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      errors.push('Invalid email format');
    }

    // Check length
    if (sanitized.length > 254) {
      errors.push('Email address too long');
      sanitized = sanitized.substring(0, 254);
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        errors.push('Invalid characters detected in email');
        sanitized = sanitized.replace(pattern, '');
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  }

  private static htmlEncode(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  private static isValidSelectOption(value: string): boolean {
    // This would check against predefined options for each field
    // For now, basic validation - no scripts or SQL
    return !this.DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
  }

  // Batch validation for multiple inputs
  static validateBatch(inputs: Array<{ value: any; type: string; fieldName: string }>): {
    isValid: boolean;
    sanitizedValues: Record<string, any>;
    errors: Record<string, string[]>;
  } {
    const sanitizedValues: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    let overallValid = true;

    for (const { value, type, fieldName } of inputs) {
      const result = this.sanitizeFilterValue(value, type as any);
      
      sanitizedValues[fieldName] = result.sanitizedValue;
      
      if (!result.isValid) {
        errors[fieldName] = result.errors;
        overallValid = false;
      }
    }

    return {
      isValid: overallValid,
      sanitizedValues,
      errors
    };
  }

  // Security header injection prevention
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      // Remove potential header injection
      const cleanKey = key.replace(/[\r\n]/g, '');
      const cleanValue = value.replace(/[\r\n]/g, '');
      
      // Skip dangerous headers
      if (!['host', 'origin', 'referer'].includes(cleanKey.toLowerCase())) {
        sanitized[cleanKey] = cleanValue;
      }
    }
    
    return sanitized;
  }
}
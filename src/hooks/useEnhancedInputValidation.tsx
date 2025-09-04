import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => string | null;
  sanitize?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

export const useEnhancedInputValidation = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  // Enhanced HTML sanitization
  const sanitizeInput = useCallback((input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol  
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim();
  }, []);

  // SQL injection pattern detection
  const detectSQLInjection = useCallback((input: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|OR|AND)\b)/i,
      /(--|\/\*|\*\/|;|'|"|\|)/,
      /(\bOR\b\s+\b1\b\s*=\s*\b1\b)/i,
      /(\bAND\b\s+\b1\b\s*=\s*\b1\b)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }, []);

  // XSS pattern detection  
  const detectXSS = useCallback((input: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe|<object|<embed|<link|<meta/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }, []);

  // Enhanced validation function
  const validateField = useCallback((
    fieldName: string, 
    value: string, 
    rules: ValidationRules
  ): ValidationResult => {
    const errors: string[] = [];
    let sanitizedValue = value;

    // Sanitize input if requested
    if (rules.sanitize) {
      sanitizedValue = sanitizeInput(value);
    }

    // Required validation
    if (rules.required && (!sanitizedValue || sanitizedValue.trim().length === 0)) {
      errors.push(`${fieldName} is required`);
    }

    // Length validations
    if (rules.minLength && sanitizedValue.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
      errors.push(`${fieldName} cannot exceed ${rules.maxLength} characters`);
    }

    // Pattern validation
    if (rules.pattern && sanitizedValue && !rules.pattern.test(sanitizedValue)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Security validations
    if (sanitizedValue && detectSQLInjection(sanitizedValue)) {
      errors.push(`${fieldName} contains potentially dangerous content`);
      toast({
        title: "Security Warning",
        description: "Input contains suspicious patterns and has been blocked",
        variant: "destructive"
      });
    }

    if (sanitizedValue && detectXSS(sanitizedValue)) {
      errors.push(`${fieldName} contains script content`);
      toast({
        title: "Security Warning", 
        description: "Input contains script patterns and has been blocked",
        variant: "destructive"
      });
    }

    // Custom validation
    if (rules.customValidator && sanitizedValue) {
      const customError = rules.customValidator(sanitizedValue);
      if (customError) {
        errors.push(customError);
      }
    }

    // Update validation errors state
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: errors
    }));

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }, [sanitizeInput, detectSQLInjection, detectXSS, toast]);

  // Validate multiple fields
  const validateForm = useCallback((
    formData: Record<string, string>,
    rulesMap: Record<string, ValidationRules>
  ): { isValid: boolean; sanitizedData: Record<string, string>; errors: Record<string, string[]> } => {
    const results: Record<string, ValidationResult> = {};
    
    Object.entries(formData).forEach(([fieldName, value]) => {
      const rules = rulesMap[fieldName] || {};
      results[fieldName] = validateField(fieldName, value, rules);
    });

    const isValid = Object.values(results).every(result => result.isValid);
    const sanitizedData = Object.fromEntries(
      Object.entries(results).map(([key, result]) => [key, result.sanitizedValue])
    );
    const errors = Object.fromEntries(
      Object.entries(results).map(([key, result]) => [key, result.errors])
    );

    return { isValid, sanitizedData, errors };
  }, [validateField]);

  // Clear validation errors
  const clearValidationErrors = useCallback((fieldName?: string) => {
    if (fieldName) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: []
      }));
    } else {
      setValidationErrors({});
    }
  }, []);

  // Pre-defined validation rules
  const validationRules = {
    email: {
      required: true,
      maxLength: 254,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      sanitize: true
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      sanitize: false // Don't sanitize passwords
    },
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-'\.]+$/,
      sanitize: true
    },
    company: {
      maxLength: 200,
      pattern: /^[a-zA-Z0-9\s\-&'\.(),]+$/,
      sanitize: true
    },
    apiKeyName: {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\s\-_]+$/,
      sanitize: true
    }
  };

  return {
    validateField,
    validateForm,
    clearValidationErrors,
    validationErrors,
    validationRules,
    sanitizeInput
  };
};
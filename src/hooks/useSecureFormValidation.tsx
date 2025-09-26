import { useCallback } from 'react';
import { useSecurityValidation } from './useSecurityValidation';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface FormValidationOptions {
  maxLength?: number;
  required?: boolean;
  emailFormat?: boolean;
  phoneFormat?: boolean;
  alphanumericOnly?: boolean;
}

export const useSecureFormValidation = () => {
  const { validateInput, sanitizeHtml } = useSecurityValidation();
  const { toast } = useToast();

  const validateFormField = useCallback((
    value: string, 
    fieldName: string, 
    options: FormValidationOptions = {}
  ): { isValid: boolean; sanitizedValue: string } => {
    const { 
      maxLength = 1000, 
      required = false, 
      emailFormat = false,
      phoneFormat = false,
      alphanumericOnly = false 
    } = options;

    // Required field check
    if (required && (!value || value.trim().length === 0)) {
      toast({
        title: "Validation Error",
        description: `${fieldName} is required`,
        variant: "destructive"
      });
      return { isValid: false, sanitizedValue: '' };
    }

    // Skip validation for empty optional fields
    if (!required && (!value || value.trim().length === 0)) {
      return { isValid: true, sanitizedValue: '' };
    }

    // Basic security validation
    if (!validateInput(value, maxLength)) {
      return { isValid: false, sanitizedValue: '' };
    }

    // Email format validation
    if (emailFormat) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        toast({
          title: "Validation Error",
          description: `Invalid ${fieldName} format`,
          variant: "destructive"
        });
        return { isValid: false, sanitizedValue: '' };
      }
    }

    // Phone format validation
    if (phoneFormat) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        toast({
          title: "Validation Error",
          description: `Invalid ${fieldName} format`,
          variant: "destructive"
        });
        return { isValid: false, sanitizedValue: '' };
      }
    }

    // Alphanumeric only validation
    if (alphanumericOnly) {
      const alphanumericRegex = /^[a-zA-Z0-9\s]*$/;
      if (!alphanumericRegex.test(value)) {
        toast({
          title: "Validation Error",
          description: `${fieldName} can only contain letters, numbers, and spaces`,
          variant: "destructive"
        });
        return { isValid: false, sanitizedValue: '' };
      }
    }

    // Sanitize the input
    const sanitizedValue = sanitizeHtml(value.trim());

    return { isValid: true, sanitizedValue };
  }, [validateInput, sanitizeHtml, toast]);

  const logSecurityEvent = useCallback(async (eventType: string, metadata: Record<string, any> = {}) => {
    try {
      await supabase.rpc('log_security_event', {
        event_type_param: eventType,
        metadata_param: metadata
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
      // Don't block user actions if logging fails
    }
  }, []);

  const validateAndSanitizeForm = useCallback((
    formData: Record<string, string>,
    validationRules: Record<string, FormValidationOptions>
  ): { isValid: boolean; sanitizedData: Record<string, string>; errors: string[] } => {
    const sanitizedData: Record<string, string> = {};
    const errors: string[] = [];
    let isValid = true;

    for (const [fieldName, value] of Object.entries(formData)) {
      const rules = validationRules[fieldName] || {};
      const result = validateFormField(value, fieldName, rules);
      
      if (!result.isValid) {
        isValid = false;
        errors.push(`Invalid ${fieldName}`);
      } else {
        sanitizedData[fieldName] = result.sanitizedValue;
      }
    }

    // Log validation attempt
    if (!isValid) {
      logSecurityEvent('form_validation_failed', {
        fields: Object.keys(formData),
        errors
      });
    }

    return { isValid, sanitizedData, errors };
  }, [validateFormField, logSecurityEvent]);

  return {
    validateFormField,
    validateAndSanitizeForm,
    logSecurityEvent
  };
};
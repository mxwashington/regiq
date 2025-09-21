import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

export const useSecureInputValidation = () => {
  const { toast } = useToast();
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateInput = useCallback(async (
    input: string,
    fieldName: string,
    options: {
      maxLength?: number;
      required?: boolean;
      allowHtml?: boolean;
      pattern?: RegExp;
    } = {}
  ): Promise<ValidationResult> => {
    try {
      // Use the secure validation function from the database
      const { data, error } = await supabase.rpc('validate_and_sanitize_input', {
        input_text: input,
        max_length: options.maxLength || 1000,
        allow_html: options.allowHtml || false
      });

      if (error) {
        console.error('Validation error:', error);
        return {
          isValid: false,
          sanitizedValue: input,
          errors: ['Validation service unavailable']
        };
      }

      const result = data as {
        is_valid: boolean;
        sanitized_text: string;
        errors: string[];
      };

      // Additional client-side validations
      const errors: string[] = [...result.errors];

      if (options.required && !result.sanitized_text.trim()) {
        errors.push(`${fieldName} is required`);
      }

      if (options.pattern && !options.pattern.test(result.sanitized_text)) {
        errors.push(`${fieldName} format is invalid`);
      }

      const isValid = errors.length === 0;

      // Update validation errors state
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: errors
      }));

      if (!isValid) {
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive"
        });
      }

      return {
        isValid,
        sanitizedValue: result.sanitized_text,
        errors
      };
    } catch (err) {
      console.error('Input validation error:', err);
      return {
        isValid: false,
        sanitizedValue: input,
        errors: ['Validation failed']
      };
    }
  }, [toast]);

  const validateForm = useCallback(async (
    formData: Record<string, string>,
    validationRules: Record<string, Parameters<typeof validateInput>[2]>
  ): Promise<{
    isValid: boolean;
    sanitizedData: Record<string, string>;
    errors: Record<string, string[]>;
  }> => {
    const sanitizedData: Record<string, string> = {};
    const errors: Record<string, string[]> = {};
    let isFormValid = true;

    for (const [fieldName, value] of Object.entries(formData)) {
      const rules = validationRules[fieldName] || {};
      const result = await validateInput(value, fieldName, rules);
      
      sanitizedData[fieldName] = result.sanitizedValue;
      errors[fieldName] = result.errors;
      
      if (!result.isValid) {
        isFormValid = false;
      }
    }

    return {
      isValid: isFormValid,
      sanitizedData,
      errors
    };
  }, [validateInput]);

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

  return {
    validateInput,
    validateForm,
    validationErrors,
    clearValidationErrors
  };
};
import React, { useState, ReactNode } from 'react';
import { useSecureInputValidation } from '@/hooks/useSecureInputValidation';
import { useSecureRateLimit } from '@/hooks/useSecureRateLimit';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SecureFormWrapperProps {
  children: ReactNode;
  onSubmit: (sanitizedData: Record<string, string>) => Promise<void>;
  formData: Record<string, string>;
  validationRules?: Record<string, {
    maxLength?: number;
    required?: boolean;
    allowHtml?: boolean;
    pattern?: RegExp;
  }>;
  rateLimitEndpoint?: string;
  className?: string;
}

export const SecureFormWrapper: React.FC<SecureFormWrapperProps> = ({
  children,
  onSubmit,
  formData,
  validationRules = {},
  rateLimitEndpoint = 'form_submission',
  className = ''
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  
  const { validateForm, validationErrors } = useSecureInputValidation();
  const { checkRateLimit } = useSecureRateLimit();
  const { toast } = useToast();

  const handleSecureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSecurityError(null);

    try {
      // Check rate limiting first
      const rateLimitPassed = await checkRateLimit(rateLimitEndpoint, 10, 25);
      if (!rateLimitPassed) {
        setSecurityError('Too many requests. Please wait before submitting again.');
        return;
      }

      // Validate and sanitize all form data
      const { isValid, sanitizedData, errors } = await validateForm(formData, validationRules);
      
      if (!isValid) {
        const errorMessages = Object.values(errors).flat();
        setSecurityError(errorMessages[0] || 'Form validation failed');
        return;
      }

      // Submit with sanitized data
      await onSubmit(sanitizedData);
      
      toast({
        title: "Success",
        description: "Form submitted successfully",
      });

    } catch (error: any) {
      console.error('Secure form submission error:', error);
      setSecurityError('Submission failed. Please try again.');
      
      toast({
        title: "Error",
        description: error.message || "An error occurred during submission",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidationErrors = Object.values(validationErrors).some(errors => errors.length > 0);

  return (
    <form onSubmit={handleSecureSubmit} className={className}>
      {securityError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{securityError}</AlertDescription>
        </Alert>
      )}
      
      {hasValidationErrors && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please fix the validation errors before submitting.
          </AlertDescription>
        </Alert>
      )}
      
      {children}
      
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={isSubmitting || hasValidationErrors}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
};
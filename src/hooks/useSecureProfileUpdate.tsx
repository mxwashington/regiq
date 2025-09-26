import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSecurityValidation } from './useSecurityValidation';

import { logger } from '@/lib/logger';
export const useSecureProfileUpdate = () => {
  const { toast } = useToast();
  const { validateInput, sanitizeHtml } = useSecurityValidation();

  const updateProfile = useCallback(async (updates: {
    full_name?: string;
    company?: string; 
    email?: string;
  }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Validate and sanitize inputs
      const sanitizedUpdates: any = {};
      
      if (updates.full_name !== undefined) {
        if (!validateInput(updates.full_name, 100)) return false;
        sanitizedUpdates.full_name = sanitizeHtml(updates.full_name);
      }
      
      if (updates.company !== undefined) {
        if (!validateInput(updates.company, 200)) return false;
        sanitizedUpdates.company = sanitizeHtml(updates.company);
      }
      
      if (updates.email !== undefined) {
        if (!validateInput(updates.email, 254)) return false;
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updates.email)) {
          toast({
            title: "Validation Error",
            description: "Invalid email format",
            variant: "destructive"
          });
          return false;
        }
        sanitizedUpdates.email = updates.email.toLowerCase().trim();
      }

      // Use the secure update function instead of direct table update
      const { error } = await supabase.rpc('update_user_profile', {
        profile_user_id: user.user.id,
        new_full_name: sanitizedUpdates.full_name,
        new_company: sanitizedUpdates.company,
        new_email: sanitizedUpdates.email
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
        variant: "default"
      });
      
      return true;
    } catch (error: any) {
      logger.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
      return false;
    }
  }, [validateInput, sanitizeHtml, toast]);

  return { updateProfile };
};
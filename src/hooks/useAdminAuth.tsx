import { useAuth } from '@/contexts/SafeAuthContext';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface AdminProfile {
  role: string;
  is_admin: boolean;
  full_name?: string;
  email: string;
}

export const useAdminAuth = () => {
  const { user, isAdmin, adminRole, loading } = useAuth();

  // Create a mock admin profile from the auth context data
  const adminProfile: AdminProfile | null = user && isAdmin ? {
    role: adminRole || 'admin',
    is_admin: isAdmin,
    full_name: user.user_metadata?.full_name || '',
    email: user.email || ''
  } : null;

  const logAdminActivity = async (action: string, targetType?: string, targetId?: string, details?: any) => {
    if (!user || !isAdmin) return;

    try {
      await supabase
        .from('admin_activities')
        .insert({
          admin_user_id: user.id,
          action,
          target_type: targetType,
          target_id: targetId,
          details: details || {},
          ip_address: null, // Could be enhanced to capture real IP
          user_agent: navigator.userAgent
        });
    } catch (error) {
      logger.error('Error logging admin activity:', error);
    }
  };

  return {
    isAdmin,
    adminProfile,
    loading,
    logAdminActivity
  };
};
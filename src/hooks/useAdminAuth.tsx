import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminProfile {
  role: string;
  is_admin: boolean;
  full_name?: string;
  email: string;
}

export const useAdminAuth = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, is_admin, full_name, email')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching admin status:', error);
          setIsAdmin(false);
          setAdminProfile(null);
        } else {
          const adminStatus = profile?.role === 'admin' || profile?.is_admin === true;
          setIsAdmin(adminStatus);
          setAdminProfile(profile as AdminProfile);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setAdminProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

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
      console.error('Error logging admin activity:', error);
    }
  };

  return {
    isAdmin,
    adminProfile,
    loading,
    logAdminActivity
  };
};
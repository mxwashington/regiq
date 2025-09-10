import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EntitlementFeature {
  feature_key: string;
  feature_value: any;
  plan_id: string;
}

interface UseEntitlementsReturn {
  entitlements: EntitlementFeature[] | null;
  hasFeature: (feature: string) => boolean;
  getFeatureValue: (feature: string) => any;
  checkUsageLimit: (feature: string, currentUsage?: number) => boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useEntitlements = (): UseEntitlementsReturn => {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<EntitlementFeature[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = async () => {
    if (!user?.id) {
      setEntitlements(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_entitlements', { user_uuid: user.id });

      if (rpcError) {
        throw rpcError;
      }

      setEntitlements(data || []);
    } catch (err) {
      console.error('Error fetching entitlements:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch entitlements');
      // Default to basic entitlements on error
      setEntitlements([
        { feature_key: 'max_facilities', feature_value: 1, plan_id: 'alerts_only' },
        { feature_key: 'ai_assistant', feature_value: false, plan_id: 'alerts_only' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, [user?.id]);

  const hasFeature = (feature: string): boolean => {
    const entitlement = entitlements?.find(e => e.feature_key === feature);
    if (!entitlement) return false;
    
    const value = entitlement.feature_value;
    return value === true || value === 'true' || (typeof value === 'number' && value > 0);
  };

  const getFeatureValue = (feature: string): any => {
    const entitlement = entitlements?.find(e => e.feature_key === feature);
    return entitlement?.feature_value || null;
  };

  const checkUsageLimit = (feature: string, currentUsage: number = 0): boolean => {
    const limit = getFeatureValue(feature);
    if (typeof limit !== 'number') return true;
    return currentUsage < limit;
  };

  return {
    entitlements,
    hasFeature,
    getFeatureValue,
    checkUsageLimit,
    loading,
    error,
    refetch: fetchEntitlements
  };
};
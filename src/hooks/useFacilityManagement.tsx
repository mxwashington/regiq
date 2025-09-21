import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Facility {
  id: string;
  name: string;
  address?: string;
  facility_type: 'manufacturing' | 'warehouse' | 'distribution' | 'retail' | 'other';
  status: 'active' | 'inactive' | 'maintenance';
  regulatory_zones: string[];
  compliance_requirements: Record<string, any>;
  contact_info: Record<string, any>;
  settings: Record<string, any>;
  user_role?: 'admin' | 'manager' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface FacilityUser {
  id: string;
  facility_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'viewer';
  permissions: Record<string, any>;
}

export const useFacilityManagement = () => {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's facilities
  const fetchFacilities = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('get_user_facilities', { user_uuid: user.id });

      if (error) throw error;

      const facilitiesData = data?.map((item: any) => ({
        id: item.facility_id,
        name: item.facility_name,
        facility_type: item.facility_type,
        status: item.status,
        user_role: item.user_role,
        // We'll fetch full details separately if needed
        address: '',
        regulatory_zones: [],
        compliance_requirements: {},
        contact_info: {},
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) || [];

      setFacilities(facilitiesData);
      
      // Auto-select first facility if none selected
      if (facilitiesData.length > 0 && !selectedFacility) {
        setSelectedFacility(facilitiesData[0].id);
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  // Create new facility
  const createFacility = async (facilityData: {
    name: string;
    address: string;
    facility_type?: string;
  }) => {
    if (!user?.id) return null;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .rpc('create_facility_with_admin', {
          facility_name: facilityData.name,
          facility_address: facilityData.address,
          facility_type: facilityData.facility_type || 'manufacturing'
        });

      if (error) throw error;

      toast.success('Facility created successfully');
      await fetchFacilities();
      return data;
    } catch (err) {
      console.error('Error creating facility:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create facility';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update facility details
  const updateFacility = async (facilityId: string, updates: Partial<Facility>) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('facilities')
        .update(updates)
        .eq('id', facilityId);

      if (error) throw error;

      toast.success('Facility updated successfully');
      await fetchFacilities();
    } catch (err) {
      console.error('Error updating facility:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update facility';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add user to facility
  const addFacilityUser = async (facilityId: string, userId: string, role: 'admin' | 'manager' | 'viewer') => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('facility_users')
        .insert({
          facility_id: facilityId,
          user_id: userId,
          role: role
        });

      if (error) throw error;

      toast.success('User added to facility successfully');
      await fetchFacilities();
    } catch (err) {
      console.error('Error adding facility user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user to facility';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Remove user from facility
  const removeFacilityUser = async (facilityId: string, userId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('facility_users')
        .delete()
        .eq('facility_id', facilityId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User removed from facility successfully');
      await fetchFacilities();
    } catch (err) {
      console.error('Error removing facility user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove user from facility';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get facility-specific alerts
  const getFacilityAlerts = async (facilityId: string) => {
    try {
      const { data, error } = await supabase
        .from('facility_alerts')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching facility alerts:', err);
      return [];
    }
  };

  // Update facility alert status
  const updateFacilityAlert = async (alertId: string, updates: {
    status?: 'new' | 'reviewing' | 'acknowledged' | 'resolved';
    assigned_to?: string;
    notes?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('facility_alerts')
        .update(updates)
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Alert updated successfully');
    } catch (err) {
      console.error('Error updating facility alert:', err);
      toast.error('Failed to update alert');
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchFacilities();
    }
  }, [user?.id]);

  return {
    facilities,
    selectedFacility,
    setSelectedFacility,
    loading,
    error,
    fetchFacilities,
    createFacility,
    updateFacility,
    addFacilityUser,
    removeFacilityUser,
    getFacilityAlerts,
    updateFacilityAlert,
  };
};
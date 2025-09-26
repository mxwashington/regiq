import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
export interface SupplierWatch {
  id: string;
  user_id: string;
  supplier_name: string;
  supplier_identifier?: string | null;
  agency?: string | null;
  keywords?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierRisk {
  supplier: SupplierWatch;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  recent_alerts: any[];
  last_alert_date?: string;
}

export const useSupplierRiskMonitoring = () => {
  const [suppliers, setSuppliers] = useState<SupplierWatch[]>([]);
  const [supplierRisks, setSupplierRisks] = useState<SupplierRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch supplier watches
  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_watches')
        .select('*')
        .order('supplier_name', { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
      return data || [];
    } catch (error) {
      logger.error('Error fetching suppliers:', error);
      toast({
        title: "Error",
        description: "Failed to load supplier watches",
        variant: "destructive"
      });
      return [];
    }
  };

  // Calculate supplier risk scores
  const calculateSupplierRisks = async (supplierData: SupplierWatch[]) => {
    try {
      const risks: SupplierRisk[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const supplier of supplierData) {
        // Search for alerts mentioning this supplier
        const { data: alertData } = await supabase
          .from('alerts')
          .select('*')
          .gte('published_date', thirtyDaysAgo.toISOString())
          .or(`title.ilike.%${supplier.supplier_name}%,summary.ilike.%${supplier.supplier_name}%,full_content.ilike.%${supplier.supplier_name}%`);

        const relevantAlerts = alertData || [];
        
        // Calculate risk score based on:
        // - Number of recent alerts (0-40 points)
        // - Alert urgency levels (0-30 points)
        // - Recency of alerts (0-30 points)
        
        let riskScore = 0;
        
        // Alert count scoring
        const alertCount = relevantAlerts.length;
        riskScore += Math.min(alertCount * 8, 40); // Max 40 points for alerts
        
        // Urgency scoring
        const urgencyScore = relevantAlerts.reduce((score, alert) => {
          if (alert.urgency === 'High') return score + 10;
          if (alert.urgency === 'Medium') return score + 5;
          return score + 2;
        }, 0);
        riskScore += Math.min(urgencyScore, 30); // Max 30 points for urgency
        
        // Recency scoring (more recent = higher risk)
        const mostRecentAlert = relevantAlerts.reduce((latest, alert) => {
          const alertDate = new Date(alert.published_date);
          return alertDate > latest ? alertDate : latest;
        }, new Date(0));
        
        if (mostRecentAlert > new Date(0)) {
          const daysAgo = Math.floor((Date.now() - mostRecentAlert.getTime()) / (1000 * 60 * 60 * 24));
          const recencyScore = Math.max(30 - daysAgo, 0); // Max 30 points, decreases over time
          riskScore += recencyScore;
        }

        // Determine risk level
        let riskLevel: SupplierRisk['risk_level'] = 'Low';
        if (riskScore >= 80) riskLevel = 'Critical';
        else if (riskScore >= 50) riskLevel = 'High';
        else if (riskScore >= 25) riskLevel = 'Medium';

        risks.push({
          supplier,
          risk_score: Math.min(riskScore, 100),
          risk_level: riskLevel,
          recent_alerts: relevantAlerts.slice(0, 5), // Show top 5 recent alerts
          last_alert_date: mostRecentAlert > new Date(0) ? mostRecentAlert.toISOString() : undefined
        });
      }

      // Sort by risk score (highest first)
      risks.sort((a, b) => b.risk_score - a.risk_score);
      setSupplierRisks(risks);
      return risks;
    } catch (error) {
      logger.error('Error calculating supplier risks:', error);
      toast({
        title: "Error",
        description: "Failed to calculate supplier risks",
        variant: "destructive"
      });
      return [];
    }
  };

  // Add new supplier watch
  const addSupplierWatch = async (supplierName: string, keywords?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('supplier_watches')
        .insert([{
          user_id: user.id,
          supplier_name: supplierName,
          keywords: keywords || []
        }])
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => [...prev, data]);
      toast({
        title: "Success",
        description: `Added ${supplierName} to watch list`
      });

      // Recalculate risks
      const updatedSuppliers = [...suppliers, data];
      await calculateSupplierRisks(updatedSuppliers);

      return data;
    } catch (error) {
      logger.error('Error adding supplier watch:', error);
      toast({
        title: "Error",
        description: "Failed to add supplier watch",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Remove supplier watch
  const removeSupplierWatch = async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('supplier_watches')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;

      const updatedSuppliers = suppliers.filter(s => s.id !== supplierId);
      setSuppliers(updatedSuppliers);
      await calculateSupplierRisks(updatedSuppliers);

      toast({
        title: "Success",
        description: "Removed supplier from watch list"
      });
    } catch (error) {
      logger.error('Error removing supplier watch:', error);
      toast({
        title: "Error", 
        description: "Failed to remove supplier watch",
        variant: "destructive"
      });
    }
  };

  // Get risk summary
  const getRiskSummary = () => {
    const summary = {
      total_suppliers: supplierRisks.length,
      critical_risk: supplierRisks.filter(s => s.risk_level === 'Critical').length,
      high_risk: supplierRisks.filter(s => s.risk_level === 'High').length,
      medium_risk: supplierRisks.filter(s => s.risk_level === 'Medium').length,
      low_risk: supplierRisks.filter(s => s.risk_level === 'Low').length,
      recent_alerts: supplierRisks.reduce((total, s) => total + s.recent_alerts.length, 0)
    };

    return summary;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const supplierData = await fetchSuppliers();
      await calculateSupplierRisks(supplierData);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    suppliers,
    supplierRisks,
    loading,
    addSupplierWatch,
    removeSupplierWatch,
    fetchSuppliers,
    calculateSupplierRisks,
    getRiskSummary
  };
};
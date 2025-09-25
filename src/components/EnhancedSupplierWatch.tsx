import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, TrendingUp, Eye, Plus, X, Clock, Building, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface Supplier {
  id: string;
  name: string;
  risk_score: number;
  last_checked: string;
  created_at: string;
  alert_count?: number;
  recent_alerts?: Array<{
    id: string;
    title: string;
    urgency_score: number;
    published_date: string;
  }>;
}

export const EnhancedSupplierWatch: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          risk_score,
          last_checked,
          created_at,
          supplier_alerts!inner(
            alerts(
              id,
              title,
              urgency_score,
              published_date
            )
          )
        `)
        .order('risk_score', { ascending: false });

      if (error) throw error;

      // Process the data to include alert counts and recent alerts
      const processedSuppliers = (data || []).map(supplier => ({
        ...supplier,
        alert_count: supplier.supplier_alerts?.length || 0,
        recent_alerts: supplier.supplier_alerts
          ?.map(sa => sa.alerts)
          .filter(Boolean)
          .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
          .slice(0, 5) || []
      }));

      // Also get suppliers with no alerts
      const { data: noAlertSuppliers, error: noAlertError } = await supabase
        .from('suppliers')
        .select('id, name, risk_score, last_checked, created_at')
        .not('id', 'in', `(${processedSuppliers.map(s => s.id).join(',') || 'null'})`);

      if (noAlertError && noAlertError.code !== 'PGRST116') {
        logger.warn('Error fetching suppliers without alerts:', noAlertError, 'EnhancedSupplierWatch');
      }

      const allSuppliers = [
        ...processedSuppliers,
        ...(noAlertSuppliers || []).map(supplier => ({
          ...supplier,
          alert_count: 0,
          recent_alerts: [] as any[]
        }))
      ].sort((a, b) => b.risk_score - a.risk_score);

      setSuppliers(allSuppliers);
    } catch (error: any) {
      logger.error('Error fetching suppliers:', error, 'EnhancedSupplierWatch');
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error('Please enter a supplier name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: newSupplierName.trim(),
          risk_score: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => [
        { ...data, alert_count: 0, recent_alerts: [] },
        ...prev
      ]);
      
      setNewSupplierName('');
      setIsAddDialogOpen(false);
      toast.success('Supplier added successfully');
    } catch (error: any) {
      logger.error('Error adding supplier:', error, 'EnhancedSupplierWatch');
      toast.error('Failed to add supplier');
    }
  };

  const removeSupplier = async (supplierId: string, supplierName: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;

      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      toast.success(`Removed ${supplierName} from watch list`);
    } catch (error: any) {
      logger.error('Error removing supplier:', error, 'EnhancedSupplierWatch');
      toast.error('Failed to remove supplier');
    }
  };

  const processSupplierAlerts = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('supplier-watch-processor', {
        body: { processBatch: true }
      });

      if (error) throw error;

      toast.success(`Processed ${data.alertsProcessed} alerts, found ${data.suppliersFound} new suppliers`);
      await fetchSuppliers(); // Refresh the list
    } catch (error: any) {
      logger.error('Error processing supplier alerts:', error, 'EnhancedSupplierWatch');
      toast.error('Failed to process supplier alerts');
    } finally {
      setProcessing(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 200) return 'destructive';
    if (score >= 100) return 'destructive';
    if (score >= 50) return 'default';
    return 'secondary';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 200) return 'Critical';
    if (score >= 100) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Supplier Watch</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supplier Watch</h2>
          <p className="text-muted-foreground">
            Monitor suppliers for regulatory alerts and risk assessment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={processSupplierAlerts}
            disabled={processing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Processing...' : 'Scan Alerts'}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Supplier to Watch List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Supplier name (e.g., ABC Food Company Inc.)"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addSupplier();
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={addSupplier}>Add Supplier</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {suppliers.filter(s => s.risk_score >= 100).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Medium Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {suppliers.filter(s => s.risk_score >= 50 && s.risk_score < 100).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Alerts</p>
                <p className="text-2xl font-bold text-green-600">
                  {suppliers.filter(s => (s.alert_count || 0) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Risk Assessment</CardTitle>
          <CardDescription>
            Risk scores are calculated based on recent alerts, enforcement actions, and recall frequency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No suppliers added yet</h3>
              <p className="text-muted-foreground mb-4">
                Add suppliers to your watch list to monitor regulatory alerts
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Supplier
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Alert Count</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead>Recent Activity</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRiskColor(supplier.risk_score)}>
                        {getRiskLabel(supplier.risk_score)} ({supplier.risk_score})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{supplier.alert_count || 0}</span>
                        {(supplier.alert_count || 0) > 0 && (
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(supplier.last_checked), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.recent_alerts && supplier.recent_alerts.length > 0 ? (
                        <div className="space-y-1">
                          {supplier.recent_alerts.slice(0, 2).map((alert) => (
                            <div key={alert.id} className="text-xs">
                              <span className="text-muted-foreground">
                                {format(new Date(alert.published_date), 'MMM d')}:
                              </span>
                              <span className="ml-1 line-clamp-1">
                                {alert.title.substring(0, 40)}...
                              </span>
                            </div>
                          ))}
                          {supplier.recent_alerts.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{supplier.recent_alerts.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No recent alerts</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSupplier(supplier.id, supplier.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
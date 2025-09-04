import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, TrendingUp, Eye, Plus, X, Clock, Building } from 'lucide-react';
import { useSupplierRiskMonitoring } from '@/hooks/useSupplierRiskMonitoring';
import { Skeleton } from '@/components/ui/skeleton';

export const SupplierRiskMonitoring: React.FC = () => {
  const { supplierRisks, loading, addSupplierWatch, removeSupplierWatch, getRiskSummary } = useSupplierRiskMonitoring();
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const summary = getRiskSummary();

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'High': return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'Medium': return <Eye className="h-4 w-4 text-warning" />;
      default: return <Building className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    
    try {
      await addSupplierWatch(newSupplierName.trim());
      setNewSupplierName('');
      setIsAddDialogOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summary.total_suppliers}</p>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {summary.critical_risk + summary.high_risk}
                </p>
                <p className="text-sm text-muted-foreground">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{summary.medium_risk}</p>
                <p className="text-sm text-muted-foreground">Medium Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summary.recent_alerts}</p>
                <p className="text-sm text-muted-foreground">Recent Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Supplier Risk Monitoring</h2>
          <p className="text-muted-foreground">Monitor regulatory risks for your key suppliers</p>
        </div>
        
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
              <div>
                <label className="text-sm font-medium">Supplier Name</label>
                <Input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="Enter supplier name"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSupplier()}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSupplier} disabled={!newSupplierName.trim()}>
                  Add Supplier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supplier Risk Cards */}
      {supplierRisks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Suppliers Watched</h3>
            <p className="text-muted-foreground mb-4">
              Add suppliers to your watch list to monitor regulatory risks
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supplierRisks.map((risk) => (
            <Card key={risk.supplier.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getRiskIcon(risk.risk_level)}
                    <div>
                      <CardTitle className="text-lg">{risk.supplier.supplier_name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={getRiskColor(risk.risk_level) as any}>
                          {risk.risk_level} Risk
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Score: {risk.risk_score}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSupplierWatch(risk.supplier.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recent Alerts:</span>
                    <span className="font-medium">{risk.recent_alerts.length}</span>
                  </div>
                  
                  {risk.last_alert_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Alert:</span>
                      <span className="font-medium">
                        {new Date(risk.last_alert_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {risk.recent_alerts.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Recent Alerts:</p>
                      <div className="space-y-1">
                        {risk.recent_alerts.slice(0, 2).map((alert, idx) => (
                          <div key={idx} className="text-xs p-2 bg-muted rounded">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {alert.agency || 'Unknown'}
                              </Badge>
                              <Badge variant={alert.urgency === 'High' ? 'destructive' : 'secondary'} className="text-xs">
                                {alert.urgency}
                              </Badge>
                            </div>
                            <p className="line-clamp-2">{alert.title}</p>
                          </div>
                        ))}
                        {risk.recent_alerts.length > 2 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{risk.recent_alerts.length - 2} more alerts
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
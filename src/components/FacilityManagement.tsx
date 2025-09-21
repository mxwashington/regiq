import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Settings, Plus, MapPin, AlertTriangle } from 'lucide-react';
import { useFacilityManagement, Facility } from '@/hooks/useFacilityManagement';

export const FacilityManagement: React.FC = () => {
  const {
    facilities,
    selectedFacility,
    setSelectedFacility,
    loading,
    createFacility,
    updateFacility,
    addFacilityUser,
    removeFacilityUser
  } = useFacilityManagement();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFacility, setNewFacility] = useState({
    name: '',
    address: '',
    facility_type: 'manufacturing' as 'manufacturing' | 'warehouse' | 'distribution' | 'retail' | 'other'
  });

  const handleCreateFacility = async () => {
    if (!newFacility.name.trim()) return;
    
    const result = await createFacility(newFacility);
    if (result) {
      setIsCreateModalOpen(false);
      setNewFacility({ name: '', address: '', facility_type: 'manufacturing' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && facilities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Loading facilities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Facility Management</h2>
          <p className="text-muted-foreground">
            Manage your facilities and monitor compliance across locations
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Facility
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Facility</DialogTitle>
              <DialogDescription>
                Add a new facility to your organization for monitoring and compliance tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="facility-name">Facility Name</Label>
                <Input
                  id="facility-name"
                  placeholder="Enter facility name"
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="facility-address">Address</Label>
                <Input
                  id="facility-address"
                  placeholder="Enter facility address"
                  value={newFacility.address}
                  onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="facility-type">Facility Type</Label>
                <Select
                  value={newFacility.facility_type}
                  onValueChange={(value: 'manufacturing' | 'warehouse' | 'distribution' | 'retail' | 'other') => setNewFacility({ 
                    ...newFacility, 
                    facility_type: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="distribution">Distribution Center</SelectItem>
                    <SelectItem value="retail">Retail Location</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFacility} disabled={!newFacility.name.trim()}>
                  Create Facility
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Facilities Found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first facility to monitor regulatory compliance.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Facility
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="users">Users & Permissions</TabsTrigger>
            <TabsTrigger value="alerts">Facility Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {facilities.map((facility) => (
                <Card 
                  key={facility.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedFacility === facility.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedFacility(facility.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        <Building2 className="w-5 h-5 mt-0.5 text-primary" />
                        <div>
                          <CardTitle className="text-base">{facility.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {facility.facility_type?.replace('_', ' ').toUpperCase()}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(facility.status)}>
                        {facility.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {facility.address && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="truncate">{facility.address}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={getRoleColor(facility.user_role || 'viewer')}>
                          {facility.user_role}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          ID: {facility.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details">
            {selectedFacility ? (
              <FacilityDetailsView 
                facility={facilities.find(f => f.id === selectedFacility)!}
                onUpdate={updateFacility}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select a facility to view details</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users">
            {selectedFacility ? (
              <FacilityUsersView 
                facilityId={selectedFacility}
                onAddUser={addFacilityUser}
                onRemoveUser={removeFacilityUser}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select a facility to manage users</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            {selectedFacility ? (
              <FacilityAlertsView facilityId={selectedFacility} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Select a facility to view alerts</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default FacilityManagement;

// Placeholder components for different views
const FacilityDetailsView: React.FC<{ 
  facility: Facility; 
  onUpdate: (id: string, updates: Partial<Facility>) => void;
}> = ({ facility, onUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility Details</CardTitle>
        <CardDescription>Manage facility information and settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Facility Name</Label>
            <Input value={facility.name} onChange={(e) => onUpdate(facility.id, { name: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={facility.address || ''} onChange={(e) => onUpdate(facility.id, { address: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select 
              value={facility.status} 
              onValueChange={(value) => onUpdate(facility.id, { status: value as 'active' | 'inactive' | 'maintenance' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FacilityUsersView: React.FC<{
  facilityId: string;
  onAddUser: (facilityId: string, userId: string, role: 'admin' | 'manager' | 'viewer') => void;
  onRemoveUser: (facilityId: string, userId: string) => void;
}> = ({ facilityId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users & Permissions</CardTitle>
        <CardDescription>Manage who has access to this facility</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">User management interface coming soon...</p>
      </CardContent>
    </Card>
  );
};

const FacilityAlertsView: React.FC<{ facilityId: string }> = ({ facilityId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility Alerts</CardTitle>
        <CardDescription>Monitor regulatory alerts specific to this facility</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Facility-specific alerts interface coming soon...</p>
      </CardContent>
    </Card>
  );
};
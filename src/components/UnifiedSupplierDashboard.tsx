import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/BackButton';
import { EnhancedSupplierWatch } from '@/components/EnhancedSupplierWatch';
import Suppliers from '@/pages/Suppliers';
import { Shield, Building2 } from 'lucide-react';

export const UnifiedSupplierDashboard: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('watch');

  // Handle deep linking via URL params and route
  useEffect(() => {
    const tab = searchParams.get('tab');
    // If visiting /supplier-risk route, default to risk tab
    if (location.pathname === '/supplier-risk') {
      setActiveTab('risk');
    } else if (tab === 'risk' || tab === 'watch') {
      setActiveTab(tab);
    }
  }, [searchParams, location.pathname]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL params for deep linking
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    setSearchParams(newParams);
  };

  return (
    <>
      <Helmet>
        <title>Supplier Management | RegIQ</title>
        <meta name="description" content="Manage your supplier watch list and monitor supplier risks with AI-powered insights." />
        <link rel="canonical" href="https://regiq.com/suppliers" />
      </Helmet>
      
      <main className="container mx-auto p-4">
        <div className="mb-4">
          <BackButton fallback="/dashboard" />
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Supplier Management</h1>
          <p className="text-muted-foreground">Monitor your suppliers and track regulatory risks in one unified dashboard.</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="watch" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Supplier Watch</span>
              <span className="sm:hidden">Watch</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />  
              <span className="hidden sm:inline">Risk Monitoring</span>
              <span className="sm:hidden">Risk</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="watch" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Supplier Watch List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="[&>main]:p-0 [&>main]:container-none">
                  <Suppliers />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Supplier Risk Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedSupplierWatch />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
};

export default UnifiedSupplierDashboard;
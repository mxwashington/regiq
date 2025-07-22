import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AdminNavigation } from '@/components/AdminNavigation';
import { FDAAnalyticsDashboard } from '@/components/FDAAnalyticsDashboard';
import { EnterpriseAdminDashboard } from '@/components/EnterpriseAdminDashboard';
import { SourceLinkManager } from '@/components/SourceLinkManager';
import { DataRefreshButton } from '@/components/DataRefreshButton';
import { ConversationalChatbot } from '@/components/ConversationalChatbot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Bot, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { loading: authLoading } = useAuthGuard(true);
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Routes>
        <Route path="dashboard" element={
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <div className="flex items-center gap-3">
                <Button 
                  variant="default" 
                  asChild
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                >
                  <Link to="/search" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Advanced Search
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs">PRO</Badge>
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  AI Search
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard?viewAsUser=true')}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View as User
                </Button>
                <DataRefreshButton />
              </div>
            </div>
            <EnterpriseAdminDashboard />
          </div>
        } />
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="user-management" element={<AdminNavigation />} />
        <Route path="analytics" element={<FDAAnalyticsDashboard />} />
        <Route path="source-links" element={<SourceLinkManager />} />
        <Route path="settings" element={<AdminNavigation />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
      
      {/* AI Chatbot for Admin */}
      <ConversationalChatbot 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />
    </div>
  );
};

export default AdminDashboard;
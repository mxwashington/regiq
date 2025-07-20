import React from 'react';
import { AlertsDashboard } from '@/components/AlertsDashboard';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { AdminNavigation } from '@/components/AdminNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { MobileNavigation } from '@/components/MobileNavigation';

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">RegIQ</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.email?.split('@')[0] || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <MobileNavigation />
            </div>
          </div>
        </header>

        {/* Admin Navigation for admin users */}
        {isAdmin && <AdminNavigation />}

        {/* Main Dashboard Content */}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="text-muted-foreground">
                Monitor regulatory changes and stay compliant across all key agencies.
              </p>
            </div>
            
            <AlertsDashboard />
          </div>
        </main>
      </div>
    </DashboardErrorBoundary>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Radio, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield
} from 'lucide-react';

export function AdminNavigation() {
  const { signOut } = useAuth();
  const { user, adminRole } = useAdminAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'RSS Feeds', href: '/admin/feeds', icon: Radio },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings }
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">RegIQ Admin</h2>
            <p className="text-sm text-muted-foreground">{adminRole?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-3">
          <div className="text-sm">
            <p className="font-medium text-gray-900">{user?.email}</p>
            <p className="text-gray-500">Admin Access</p>
          </div>
          <Button 
            onClick={handleSignOut}
            variant="outline" 
            size="sm"
            className="w-full flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
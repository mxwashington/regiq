import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, TrendingUp, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
}

const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Advanced Search', badge: 'PRO' },
    { path: '/dashboard', icon: Bell, label: 'Alerts' },
    { path: '/risk-predictor', icon: TrendingUp, label: 'Risk' },
    { path: '/auth', icon: User, label: user ? 'Profile' : 'Login' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-1 py-0 min-w-0 h-4"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-xs mt-1 ${active ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
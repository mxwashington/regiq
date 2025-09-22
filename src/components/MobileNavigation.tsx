import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User, Building2, AlertTriangle, Calendar } from 'lucide-react';
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
    { path: '/dashboard', icon: Bell, label: 'Alerts' },
    { path: '/calendar', icon: Calendar, label: 'Calendar', badge: 'NEW' },
    { path: '/regulatory-gap-detection', icon: AlertTriangle, label: 'Gap Detection', badge: 'NEW' },
    { path: '/suppliers', icon: Building2, label: 'Suppliers' },
    { path: '/account', icon: User, label: user ? 'Profile' : 'Login' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] w-full bg-background/95 backdrop-blur-md border-t border-border md:hidden">
      <div 
        className="flex items-end justify-around w-full px-4 pt-2 pb-3 min-h-[70px]" 
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-shrink-0 min-w-[60px] max-w-[80px] flex-1 min-h-[60px] px-1 py-1 rounded-lg transition-colors touch-manipulation ${
                active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] px-1 py-0 min-w-0 h-3 leading-none"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span 
                className={`text-[10px] leading-[1.2] text-center w-full mt-1 whitespace-nowrap overflow-visible ${active ? 'font-medium' : ''}`}
                style={{ maxWidth: 'none' }}
              >
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
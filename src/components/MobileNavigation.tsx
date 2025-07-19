import React, { useState } from 'react';
import { Menu, X, Home, Search, BarChart3, CreditCard, Shield, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    requiresAuth: true,
  },
  {
    title: 'Search',
    href: '/search',
    icon: Search,
    requiresAuth: true,
  },
  {
    title: 'Subscription',
    href: '/subscription',
    icon: CreditCard,
    requiresAuth: true,
  },
  {
    title: 'Admin Dashboard',
    href: '/admin',
    icon: Shield,
    requiresAuth: true,
    adminOnly: true,
  },
];

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const handleNavigation = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate('/');
  };

  const filteredItems = navigationItems.filter(item => {
    if (item.requiresAuth && !user) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-muted"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open navigation menu</span>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold text-primary">
                RegIQ
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {user && (
              <div className="flex items-center gap-3 pt-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user.email}
                  </p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Administrator
                    </p>
                  )}
                </div>
              </div>
            )}
          </SheetHeader>

          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-12 text-left",
                      isActive && "bg-primary/10 text-primary font-medium"
                    )}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Button>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              {!user ? (
                <Button
                  variant="default"
                  className="w-full gap-3"
                  onClick={() => handleNavigation('/auth')}
                >
                  <User className="h-5 w-5" />
                  Sign In
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-3 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
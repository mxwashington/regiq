import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Bell, Building2, TrendingUp, User, BookOpen, Brain, CheckSquare, Calendar, BarChart3, Shield, AlertTriangle, Mail, Settings, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
}

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const navItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/dashboard', icon: Bell, label: 'Alerts' },
    { path: '/search', icon: Search, label: 'AskRegIQ' },
    { path: '/custom-alerts', icon: Mail, label: 'Custom Alerts' },
    { path: user ? '/account' : '/auth', icon: User, label: user ? 'Account' : 'Sign In' },
    { path: '/pricing', icon: TrendingUp, label: 'Pricing' },
  ];

  const adminNavItems: NavItem[] = [
    { path: '/admin', icon: Database, label: 'Admin Dashboard' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <Sidebar
      className="border-r border-border bg-background"
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          active
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        }`}
                      >
                        <div className="relative flex items-center">
                          <Icon className="h-5 w-5" />
                          {item.badge && !isCollapsed && (
                            <Badge
                              variant="secondary"
                              className="ml-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 h-5 leading-none"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {item.badge && isCollapsed && (
                            <Badge
                              variant="secondary"
                              className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 py-0 min-w-0 h-3 leading-none"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        {!isCollapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
              Admin
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            active
                              ? 'bg-destructive/10 text-destructive font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          }`}
                        >
                          <div className="relative flex items-center">
                            <Icon className="h-5 w-5" />
                            {item.badge && !isCollapsed && (
                              <Badge
                                variant="destructive"
                                className="ml-2 text-[10px] px-2 py-0.5 h-5 leading-none"
                              >
                                {item.badge}
                              </Badge>
                            )}
                            {item.badge && isCollapsed && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 text-[8px] px-1 py-0 min-w-0 h-3 leading-none"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {!isCollapsed && <span>{item.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
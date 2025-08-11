import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Search, Bell, TrendingUp, User, LogOut, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AppFrameProps {
  children: React.ReactNode;
}

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/search", label: "Advanced Search", icon: Search },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/risk-dashboard", label: "Risk", icon: TrendingUp },
  { to: "/account", label: "Account", icon: User },
];

export const AppFrame: React.FC<AppFrameProps> = ({ children }) => {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="px-2 py-1 font-semibold">RegIQ</div>
          <div className="px-2">
            <Input placeholder="Search…" className="h-8" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)}>
                      <NavLink to={item.to} className={({ isActive }) => (isActive ? "bg-muted text-primary" : "") }>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="h-12 flex items-center gap-2 px-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
          <div className="font-semibold">RegIQ</div>
          <div className="ml-auto flex items-center gap-2">
            <Input placeholder="Quick search…" className="h-8 w-40 md:w-64" />
          </div>
        </header>
        <div className="min-h-[calc(100svh-3rem)]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppFrame;

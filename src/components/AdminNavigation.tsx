import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Users, Settings, Shield, ArrowLeft, MonitorSpeaker } from 'lucide-react';
const adminNavItems = [{
  title: 'Analytics',
  path: '/admin/analytics',
  icon: BarChart3,
  description: 'Usage metrics and insights'
}, {
  title: 'User Management',
  path: '/admin/user-management',
  icon: Users,
  description: 'User management and roles'
}, {
  title: 'Settings',
  path: '/admin/settings',
  icon: Settings,
  description: 'App configuration'
}];
export const AdminNavigation = () => {
  const location = useLocation();
  return <div className="space-y-6">
      {/* Admin Header */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-3 mb-2">
          
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Badge variant="secondary">Admin</Badge>
        </div>
        <p className="text-muted-foreground">
          Manage RegIQ users, settings, and analytics
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" asChild>
          
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Navigation Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {adminNavItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return <Link key={item.path} to={item.path}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isActive ? 'border-primary bg-primary/5' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className={`font-semibold ${isActive ? 'text-primary' : ''}`}>
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>;
      })}
      </div>
    </div>;
};
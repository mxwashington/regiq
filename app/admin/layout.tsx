// Admin Layout with Server-Side Guard
// Ensures only admin users can access the admin dashboard

import { Suspense } from 'react';
import { requireAdmin } from '@/lib/admin-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Database,
  Activity,
  FileText,
  Settings,
  User,
  Calendar,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Server-side admin verification - redirects if not admin
  const adminProfile = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header - Mobile Optimized */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16 gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm md:text-xl font-semibold text-gray-900 dark:text-white truncate">
                  RegIQ Admin
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  Data Pipeline Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="hidden md:flex items-center gap-1 text-xs">
                <User className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{adminProfile.full_name || adminProfile.email}</span>
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-1">
                <Shield className="h-3 w-3" />
                <span className="hidden sm:inline">{adminProfile.role || 'Admin'}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-8">
        <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
          {/* Mobile-Optimized TabsList */}
          <div className="sticky top-0 z-30 bg-gray-50 dark:bg-gray-900 -mx-3 sm:-mx-4 lg:-mx-8 px-3 sm:px-4 lg:px-8 py-2 border-b">
            <TabsList className="grid w-full grid-cols-5 h-auto lg:w-auto lg:grid-cols-none lg:flex">
              <TabsTrigger 
                value="overview" 
                className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 min-h-[44px] py-2 px-2 lg:px-4 text-xs lg:text-sm"
              >
                <Database className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="text-[10px] lg:text-sm">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="agencies" 
                className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 min-h-[44px] py-2 px-2 lg:px-4 text-xs lg:text-sm"
              >
                <FileText className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="text-[10px] lg:text-sm">Agencies</span>
              </TabsTrigger>
              <TabsTrigger 
                value="health" 
                className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 min-h-[44px] py-2 px-2 lg:px-4 text-xs lg:text-sm"
              >
                <Activity className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="text-[10px] lg:text-sm">Health</span>
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 min-h-[44px] py-2 px-2 lg:px-4 text-xs lg:text-sm"
              >
                <Calendar className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="text-[10px] lg:text-sm">Logs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 min-h-[44px] py-2 px-2 lg:px-4 text-xs lg:text-sm"
              >
                <Settings className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="text-[10px] lg:text-sm">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <Suspense fallback={<AdminLoadingSkeleton />}>
            {children}
          </Suspense>
        </Tabs>
      </div>
    </div>
  );
}

// Loading skeleton for admin content - Mobile Optimized
function AdminLoadingSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 md:h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-2 md:h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 md:h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 md:w-1/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
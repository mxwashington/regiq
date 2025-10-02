// Admin Dashboard Overview Page
// Main dashboard with KPIs and sync controls

import { Suspense } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { KpiCards } from '@/components/admin/KpiCards';
import { SyncControls } from '@/components/admin/SyncControls';
import { DuplicatesWidget } from '@/components/admin/DuplicatesWidget';
import { AgencyTable } from '@/components/admin/AgencyTable';
import { HealthTable } from '@/components/admin/HealthTable';
import { LogsTable } from '@/components/admin/LogsTable';
import { SettingsPanel } from '@/components/admin/SettingsPanel';

export default function AdminDashboard() {
  return (
    <>
      {/* Overview Tab - Mobile Optimized */}
      <TabsContent value="overview" className="space-y-4 md:space-y-6">
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards />
        </Suspense>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <Suspense fallback={<SyncControlsSkeleton />}>
              <SyncControls />
            </Suspense>
          </div>

          <div>
            <Suspense fallback={<DuplicatesWidgetSkeleton />}>
              <DuplicatesWidget />
            </Suspense>
          </div>
        </div>
      </TabsContent>

      {/* Agencies Tab - Mobile Optimized */}
      <TabsContent value="agencies" className="space-y-4 md:space-y-6">
        <Suspense fallback={<AgencyTableSkeleton />}>
          <AgencyTable />
        </Suspense>
      </TabsContent>

      {/* Health Tab - Mobile Optimized */}
      <TabsContent value="health" className="space-y-4 md:space-y-6">
        <Suspense fallback={<HealthTableSkeleton />}>
          <HealthTable />
        </Suspense>
      </TabsContent>

      {/* Logs Tab - Mobile Optimized */}
      <TabsContent value="logs" className="space-y-4 md:space-y-6">
        <Suspense fallback={<LogsTableSkeleton />}>
          <LogsTable />
        </Suspense>
      </TabsContent>

      {/* Settings Tab - Mobile Optimized */}
      <TabsContent value="settings" className="space-y-4 md:space-y-6">
        <Suspense fallback={<SettingsPanelSkeleton />}>
          <SettingsPanel />
        </Suspense>
      </TabsContent>
    </>
  );
}

// Loading skeletons - Mobile Optimized
function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 md:h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      ))}
    </div>
  );
}

function SyncControlsSkeleton() {
  return <div className="h-48 md:h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>;
}

function DuplicatesWidgetSkeleton() {
  return <div className="h-48 md:h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>;
}

function AgencyTableSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="h-12 md:h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      <div className="h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    </div>
  );
}

function HealthTableSkeleton() {
  return <div className="h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>;
}

function LogsTableSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="h-12 md:h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      <div className="h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    </div>
  );
}

function SettingsPanelSkeleton() {
  return <div className="h-64 md:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>;
}
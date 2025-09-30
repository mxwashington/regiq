import { RegIQFeed } from "@/components/RegIQFeed";
import { DashboardFilterPanel } from "@/components/DashboardFilterPanel";
import { useAlertFilters } from "@/hooks/useAlertFilters";
import { Helmet } from 'react-helmet-async';
import { useState } from "react";

interface Alert {
  id: string;
  title: string;
  source: string;
  agency?: string;
  published_date: string;
  summary: string;
  urgency: string;
  external_url?: string;
  full_content?: string;
}

export default function RegIQFeedPage() {
  const [savedAlerts, setSavedAlerts] = useState<Alert[]>([]);
  const { filters, setSinceDays, setSearchQuery, toggleSource, resetFilters } = useAlertFilters();

  const handleSaveAlert = (alert: Alert) => {
    setSavedAlerts(prev => {
      if (prev.some(a => a.id === alert.id)) {
        return prev.filter(a => a.id !== alert.id);
      }
      return [...prev, alert];
    });
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - RegIQ | Real-time Regulatory Alerts</title>
        <meta name="description" content="Monitor FDA, USDA, EPA regulatory alerts in real-time. Filter by agency, date, and severity." />
      </Helmet>
      
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Filters Sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <DashboardFilterPanel
            filters={filters}
            onSourceToggle={toggleSource}
            onSinceDaysChange={setSinceDays}
            onSearchChange={setSearchQuery}
            onReset={resetFilters}
          />
        </div>

        {/* Main Feed */}
        <div className="flex-1 min-w-0">
          <RegIQFeed 
            onSaveAlert={handleSaveAlert}
            savedAlerts={savedAlerts}
          />
        </div>
      </div>
    </>
  );
}
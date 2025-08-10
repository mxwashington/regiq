import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const StatCard = ({ title, value, hint }: { title: string; value: string | number; hint?: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      {hint && <CardDescription>{hint}</CardDescription>}
    </CardHeader>
    <CardContent className="text-3xl font-bold">{value}</CardContent>
  </Card>
);

const AdminAnalytics: React.FC = () => {
  const [overview, setOverview] = useState<any | null>(null);

  useEffect(()=>{
    const load = async ()=>{
      const { data } = await supabase.rpc('get_analytics_overview', { days_back: 30 });
      setOverview(data?.[0] || null);
    };
    load();
  },[]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin Analytics - RegIQ</title>
        <meta name="description" content="MRR, churn, DAU and product usage analytics for RegIQ." />
        <link rel="canonical" href="https://regiq.com/admin/analytics" />
      </Helmet>

      <section className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Admin Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Page Views (30d)" value={overview?.total_page_views ?? '—'} />
          <StatCard title="Unique Visitors (30d)" value={overview?.unique_visitors ?? '—'} />
          <StatCard title="Avg Session (s)" value={Math.round(overview?.avg_session_duration || 0)} />
          <StatCard title="Bounce Rate" value={`${overview?.bounce_rate ?? '—'}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto">{JSON.stringify(overview?.top_pages, null, 2)}</pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>User Growth</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto">{JSON.stringify(overview?.user_growth, null, 2)}</pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Device Breakdown</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto">{JSON.stringify(overview?.device_breakdown, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default AdminAnalytics;

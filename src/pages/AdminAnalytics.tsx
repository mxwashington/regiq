import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  const [subStats, setSubStats] = useState<{ active: number; mrr: number }>({ active: 0, mrr: 0 });

  useEffect(()=>{
    const load = async ()=>{
      const { data } = await supabase.rpc('get_analytics_overview', { days_back: 30 });
      setOverview(data?.[0] || null);
      const { data: subs } = await (supabase as any).from('subscribers').select('subscribed').eq('subscribed', true);
      const active = subs?.length || 0;
      setSubStats({ active, mrr: active * 799 });
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
        <h1 className="text-3xl font-bold mb-4">Admin Analytics</h1>
        <div className="mb-6">
          <Button onClick={async ()=>{
            try {
              const { data, error } = await (supabase as any).functions.invoke('send-daily-digest', { body: { dryRun: true } });
              alert(error ? `Digest dry run failed: ${error.message}` : `Digest dry run OK. Recipients: ${data?.recipients ?? 'n/a'}`);
            } catch (e:any) {
              alert(`Digest dry run error: ${e?.message || e}`);
            }
          }}>Test Daily Digest (dry run)</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard title="Page Views (30d)" value={overview?.total_page_views ?? '—'} />
          <StatCard title="Unique Visitors (30d)" value={overview?.unique_visitors ?? '—'} />
          <StatCard title="Avg Session (s)" value={Math.round(overview?.avg_session_duration || 0)} />
          <StatCard title="Bounce Rate" value={`${overview?.bounce_rate ?? '—'}%`} />
          <StatCard title="Active Subs" value={subStats.active} hint="Current paying customers" />
          <StatCard title="MRR" value={`$${subStats.mrr}`} hint="Estimated @ $799" />
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

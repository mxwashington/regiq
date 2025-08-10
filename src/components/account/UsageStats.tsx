import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const UsageStats: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(()=>{
    const load = async ()=>{
      if (!user) return;
      const { data } = await (supabase as any).from('usage_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
      setRows(data || []);
    };
    load();
  },[user]);

  const summary = useMemo(()=>{
    const map = new Map<string, number>();
    rows.forEach(r=> map.set(r.feature_name, (map.get(r.feature_name)||0)+ (r.amount || 1)));
    return Array.from(map.entries()).map(([feature, count])=>({ feature, count }));
  },[rows]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {summary.length === 0 ? (
          <div className="text-sm text-muted-foreground">No usage yet.</div>
        ) : (
          <ul className="grid gap-2">
            {summary.map(s=> (
              <li key={s.feature} className="flex justify-between border rounded px-3 py-2"><span>{s.feature}</span><span className="font-mono">{s.count}</span></li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageStats;

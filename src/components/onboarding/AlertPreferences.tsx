import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AGENCIES = ["FDA","USDA","EPA","CDC"] as const;

export const AlertPreferences: React.FC<{ onNext: () => void, onBack: () => void }>=({ onNext, onBack })=>{
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>(["FDA","USDA","EPA"]);
  const [loading, setLoading] = useState(false);
  const toggle = (a: string) => setSelected(prev=> prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a]);

  const save = async () => {
    if (!user) return onNext();
    setLoading(true);
    try {
      await (supabase as any).from('user_preferences').upsert({ user_id: user.id, preferred_sources: selected, email_notifications: true, urgency_threshold: 'Low' });
      toast.success('Preferences saved');
      onNext();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Preferences</CardTitle>
        <CardDescription>Select agencies to follow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {AGENCIES.map(a=> (
            <button key={a} onClick={()=>toggle(a)} className={`border rounded px-3 py-2 text-left ${selected.includes(a) ? 'border-primary bg-primary/5' : ''}`}>{a}</button>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Continue'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertPreferences;

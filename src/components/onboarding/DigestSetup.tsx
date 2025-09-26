import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { logger } from '@/lib/logger';
export const DigestSetup: React.FC<{ onNext: () => void, onBack: () => void }>=({ onNext, onBack })=>{
  const { user } = useAuth();
  const [time, setTime] = useState("08:00");
  const [freq, setFreq] = useState("daily");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      if (!user) {
        toast.error('Please sign in to save preferences');
        return;
      }

      // Save to digest_preferences table
      const { error } = await supabase.from('digest_preferences').upsert({
        user_id: user.id,
        enabled: true,
        time: time,
        frequency: freq
      });

      if (error) throw error;

      toast.success('Digest preferences saved');
      onNext();
    } catch (e) {
      logger.error('Error saving digest preferences:', e);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Digest</CardTitle>
        <CardDescription>Choose when to receive your email digest</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Frequency</Label>
          <Select value={freq} onValueChange={setFreq}>
            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekday">Weekdays</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Send Time</Label>
          <input type="time" value={time} onChange={(e)=>setTime(e.target.value)} className="border rounded px-3 py-2 bg-background" />
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Continue'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DigestSetup;

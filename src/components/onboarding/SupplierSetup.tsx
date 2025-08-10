import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const SupplierSetup: React.FC<{ onNext: () => void, onBack: () => void }>=({ onNext, onBack })=>{
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<string[]>(["","",""]);
  const [loading, setLoading] = useState(false);

  const setItem = (i:number, v:string)=> setSuppliers(prev=> prev.map((s,idx)=> idx===i? v : s));

  const save = async () => {
    if (!user) return onNext();
    const items = suppliers.map(s=> s.trim()).filter(Boolean);
    if (items.length === 0) return onNext();
    setLoading(true);
    try {
      const rows = items.map(name => ({ user_id: user.id, supplier_name: name }));
      await (supabase as any).from('supplier_watches').insert(rows);
      toast.success('Suppliers saved');
      onNext();
    } catch (e:any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save suppliers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Key Suppliers</CardTitle>
        <CardDescription>Add 3–5 suppliers to watch for recalls</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suppliers.map((s,i)=> (
          <Input key={i} placeholder={`Supplier ${i+1}`} value={s} onChange={(e)=>setItem(i, e.target.value)} />
        ))}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Continue'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierSetup;

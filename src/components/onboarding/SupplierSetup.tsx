import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RegulatoryInputSanitizer } from '@/lib/security/input-sanitizer';

import { logger } from '@/lib/logger';
export const SupplierSetup: React.FC<{ onNext: () => void, onBack: () => void }>=({ onNext, onBack })=>{
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<string[]>(["","",""]);
  const [loading, setLoading] = useState(false);

  const setItem = (i:number, v:string)=> {
    // Validate and sanitize supplier name input
    const validation = RegulatoryInputSanitizer.sanitizeSupplierName(v);
    if (validation.isValid) {
      setSuppliers(prev=> prev.map((s,idx)=> idx===i? validation.sanitizedValue : s));
    } else {
      // Show user input but warn about issues
      setSuppliers(prev=> prev.map((s,idx)=> idx===i? v : s));
      if (v.trim().length > 0) {
        logger.warn('Invalid supplier name input:', validation.errors);
      }
    }
  };

  const save = async () => {
    if (!user) return onNext();
    const items = suppliers.map(s=> s.trim()).filter(Boolean);
    if (items.length === 0) return onNext();

    // Validate all supplier names before saving
    const validationResults = items.map(name => RegulatoryInputSanitizer.sanitizeSupplierName(name));
    const invalidItems = validationResults.filter(result => !result.isValid);

    if (invalidItems.length > 0) {
      const errors = invalidItems.flatMap(item => item.errors).join(', ');
      toast.error(`Invalid supplier names: ${errors}`);
      return;
    }

    setLoading(true);
    try {
      // Use sanitized values
      const sanitizedNames = validationResults.map(result => result.sanitizedValue);
      const rows = sanitizedNames.map(name => ({ user_id: user.id, supplier_name: name }));
      await (supabase as any).from('supplier_watches').insert(rows);
      toast.success('Suppliers saved');
      onNext();
    } catch (e:any) {
      logger.error(e);
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

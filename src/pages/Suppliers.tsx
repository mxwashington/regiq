import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2 } from "lucide-react";

const Suppliers: React.FC = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Array<{ id: string; supplier_name: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");

  const loadSuppliers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_watches')
        .select('id, supplier_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const addSupplier = async () => {
    const name = newSupplier.trim();
    if (!name) return;
    if (!user) return;
    setAdding(true);
    try {
      const { error } = await supabase
        .from('supplier_watches')
        .insert({ user_id: user.id, supplier_name: name });
      if (error) throw error;
      toast.success('Supplier added');
      setNewSupplier("");
      await loadSuppliers();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to add supplier');
    } finally {
      setAdding(false);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Remove this supplier from your watch list?')) return;
    try {
      const { error } = await supabase.from('supplier_watches').delete().eq('id', id);
      if (error) throw error;
      toast.success('Supplier removed');
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to remove supplier');
    }
  };

  return (
    <main className="container mx-auto p-4">
      <Helmet>
        <title>Supplier Watch | Manage Suppliers</title>
        <meta name="description" content="Manage your supplier watch list to get recall alerts and regulatory updates." />
        <link rel="canonical" href="https://regiq.com/suppliers" />
      </Helmet>

      <section className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Supplier Watch</h1>
        <p className="text-muted-foreground">Track suppliers and get notified about recalls and regulatory actions.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your Suppliers</CardTitle>
            <CardDescription>These suppliers are monitored for recalls and alerts.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : suppliers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No suppliers yet. Add your first supplier to start monitoring.</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.supplier_name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" aria-label={`Remove ${s.supplier_name}`} onClick={() => deleteSupplier(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Supplier</CardTitle>
            <CardDescription>Maximum per your plan. You can change this anytime.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Acme Foods Inc."
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                aria-label="Supplier name"
              />
              <Button onClick={addSupplier} disabled={adding || !newSupplier.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground space-y-2">
              <p>We match supplier names to official sources for recalls and enforcement actions.</p>
              <p>
                Tip: Use the full legal name for best results. Plan limits apply.{' '}
                <Badge variant="secondary">Monitored</Badge>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Suppliers;

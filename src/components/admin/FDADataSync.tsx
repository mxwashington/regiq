import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const FDADataSync = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const triggerFunction = async (functionName: string, displayName: string) => {
    setLoading(prev => ({ ...prev, [functionName]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { days: 30 }
      });

      if (error) throw error;

      toast({
        title: `${displayName} Sync Complete`,
        description: `Status: ${data.success ? 'Success' : 'Failed'}\n${JSON.stringify(data, null, 2)}`,
      });
    } catch (error) {
      toast({
        title: `${displayName} Sync Failed`,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [functionName]: false }));
    }
  };

  const functions = [
    {
      name: 'fetch-openfda-enforcement',
      display: 'FDA Enforcement Reports',
      description: 'Food, Drug, Device recalls (last 30 days)'
    },
    {
      name: 'fetch-faers-adverse-events',
      display: 'FAERS Adverse Events',
      description: 'Drug adverse events (last 90 days)'
    },
    {
      name: 'fda-import-alerts',
      display: 'FDA Import Alerts',
      description: 'Import detention alerts'
    },
    {
      name: 'fda-warning-letters',
      display: 'FDA Warning Letters',
      description: 'Enforcement warning letters'
    },
    {
      name: 'fda-compliance-pipeline',
      display: 'FDA Inspection Citations',
      description: 'Form 483 observations'
    }
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">FDA Data Sync</h2>
      <div className="space-y-3">
        {functions.map(func => (
          <div key={func.name} className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium">{func.display}</p>
              <p className="text-sm text-muted-foreground">{func.description}</p>
            </div>
            <Button
              onClick={() => triggerFunction(func.name, func.display)}
              disabled={loading[func.name]}
            >
              {loading[func.name] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Now'
              )}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Calendar, Building2, ExternalLink } from 'lucide-react';

export function DataSourceDisplay() {
  const { data: recalls } = useQuery({
    queryKey: ['recalls-display'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recalls')
        .select('*')
        .order('recall_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const { data: outbreaks } = useQuery({
    queryKey: ['outbreaks-display'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cdc_outbreak_alerts')
        .select('*')
        .order('publish_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const { data: advisories } = useQuery({
    queryKey: ['advisories-display'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cdc_emergency_advisories')
        .select('*')
        .order('publish_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Regulatory Data</h2>
        <p className="text-muted-foreground">
          Recent FDA recalls, USDA recalls, and CDC outbreak alerts
        </p>
      </div>

      <Tabs defaultValue="recalls" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recalls">
            Recalls ({recalls?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="outbreaks">
            Outbreaks ({outbreaks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="advisories">
            Advisories ({advisories?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recalls" className="space-y-4">
          {recalls?.map((recall) => (
            <Card key={recall.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{recall.product_name}</CardTitle>
                    <CardDescription className="mt-2">
                      {recall.product_description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      recall.classification === 'Class I'
                        ? 'destructive'
                        : recall.classification === 'Class II'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {recall.classification}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {recall.company_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(recall.recall_date).toLocaleDateString()}
                  </div>
                  <Badge variant="outline">{recall.source}</Badge>
                  <Badge variant="outline">{recall.product_type}</Badge>
                </div>
                {recall.reason && (
                  <p className="text-sm">
                    <span className="font-semibold">Reason:</span> {recall.reason}
                  </p>
                )}
                {recall.source_url && (
                  <a
                    href={recall.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Details
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="outbreaks" className="space-y-4">
          {outbreaks?.map((outbreak) => (
            <Card key={outbreak.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{outbreak.outbreak_title}</CardTitle>
                    {outbreak.pathogen_type && (
                      <Badge className="mt-2" variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {outbreak.pathogen_type}
                      </Badge>
                    )}
                  </div>
                  {outbreak.investigation_status && (
                    <Badge variant="outline">{outbreak.investigation_status}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(outbreak.publish_date).toLocaleDateString()}
                  </div>
                  {outbreak.implicated_foods?.map((food: string) => (
                    <Badge key={food} variant="secondary">
                      {food}
                    </Badge>
                  ))}
                </div>
                {outbreak.source_url && (
                  <a
                    href={outbreak.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    CDC Investigation Details
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="advisories" className="space-y-4">
          {advisories?.map((advisory) => (
            <Card key={advisory.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{advisory.title}</CardTitle>
                  {advisory.urgency && (
                    <Badge
                      variant={
                        advisory.urgency === 'High'
                          ? 'destructive'
                          : advisory.urgency === 'Medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {advisory.urgency}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {advisory.description && (
                  <p className="text-sm text-muted-foreground">{advisory.description}</p>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(advisory.publish_date).toLocaleDateString()}
                  </div>
                  {advisory.keywords?.map((keyword: string) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                {advisory.source_url && (
                  <a
                    href={advisory.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Read Full Advisory
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

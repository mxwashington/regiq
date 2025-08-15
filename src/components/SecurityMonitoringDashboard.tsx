import React, { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Shield, AlertTriangle, Clock, User } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  metadata: any; // Use any type to handle Json type from Supabase
  created_at: string;
  user_id?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  recentFailedLogins: number;
  suspiciousActivity: number;
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    recentFailedLogins: 0,
    suspiciousActivity: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchSecurityEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setEvents(data || []);
      
      // Calculate metrics
      const totalEvents = data?.length || 0;
      const criticalEvents = data?.filter(e => 
        e.event_type.includes('failed') || 
        e.event_type.includes('violation') ||
        e.event_type.includes('blocked')
      ).length || 0;
      
      const recentFailedLogins = data?.filter(e => 
        e.event_type.includes('login_failed') ||
        e.event_type.includes('auth_failed')
      ).length || 0;
      
      const suspiciousActivity = data?.filter(e => 
        e.event_type.includes('suspicious') ||
        e.event_type.includes('rate_limit') ||
        e.event_type.includes('csp_violation')
      ).length || 0;

      setMetrics({
        totalEvents,
        criticalEvents,
        recentFailedLogins,
        suspiciousActivity
      });

    } catch (error: any) {
      console.error('Failed to fetch security events:', error);
      toast({
        title: "Error",
        description: "Failed to load security events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getEventSeverity = (eventType: string): 'high' | 'medium' | 'low' => {
    if (eventType.includes('failed') || eventType.includes('violation') || eventType.includes('blocked')) {
      return 'high';
    }
    if (eventType.includes('suspicious') || eventType.includes('rate_limit')) {
      return 'medium';
    }
    return 'low';
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low'): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, [fetchSecurityEvents]);

  return (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalEvents}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{metrics.criticalEvents}</p>
                <p className="text-xs text-muted-foreground">Critical Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-500">{metrics.recentFailedLogins}</p>
                <p className="text-xs text-muted-foreground">Failed Logins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{metrics.suspiciousActivity}</p>
                <p className="text-xs text-muted-foreground">Suspicious Activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events Log */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Events Log
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSecurityEvents}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No security events found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => {
                  const severity = getEventSeverity(event.event_type);
                  return (
                    <div key={event.id}>
                      <div className="flex items-start justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(severity)}>
                              {formatEventType(event.event_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="text-sm text-muted-foreground mt-1">
                              <pre className="whitespace-pre-wrap text-xs">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                      {index < events.length - 1 && <Separator className="my-2" />}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
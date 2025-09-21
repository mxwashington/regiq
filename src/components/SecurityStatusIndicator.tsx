import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityStatus {
  level: 'secure' | 'warning' | 'critical';
  message: string;
  details?: string;
}

export const SecurityStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SecurityStatus>({
    level: 'secure',
    message: 'System Secure'
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkSecurityStatus = async () => {
      try {
        // Check for recent security events
        const { data: events, error } = await supabase
          .from('security_events')
          .select('event_type, metadata, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (error && error.code !== 'PGRST116') {
          console.warn('Could not check security events:', error);
          setStatus({
            level: 'warning',
            message: 'Security Status Unknown',
            details: 'Unable to verify security status'
          });
          return;
        }

        const recentEvents = events || [];
        const criticalEvents = recentEvents.filter(event => {
          const metadata = event.metadata as any;
          return metadata?.threat_level === 'critical' || 
            event.event_type.includes('attack') ||
            event.event_type.includes('breach');
        });

        const warningEvents = recentEvents.filter(event => {
          const metadata = event.metadata as any;
          return metadata?.threat_level === 'high' || 
            event.event_type.includes('suspicious') ||
            event.event_type.includes('rate_limit');
        });

        if (criticalEvents.length > 0) {
          setStatus({
            level: 'critical',
            message: 'Critical Security Alert',
            details: `${criticalEvents.length} critical event(s) detected`
          });
        } else if (warningEvents.length > 5) {
          setStatus({
            level: 'warning',
            message: 'Security Warning',
            details: `${warningEvents.length} security event(s) in last 24h`
          });
        } else {
          setStatus({
            level: 'secure',
            message: 'System Secure',
            details: recentEvents.length > 0 ? 
              `${recentEvents.length} minor event(s) tracked` : 
              'No security events detected'
          });
        }
      } catch (error) {
        console.error('Security check error:', error);
        setStatus({
          level: 'warning',
          message: 'Security Check Failed'
        });
      } finally {
        setLoading(false);
      }
    };

    checkSecurityStatus();
    
    // Refresh every 5 minutes
    const interval = setInterval(checkSecurityStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'secure': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'secure':
        return <CheckCircle className="h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />;
      case 'critical':
        return <Shield className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        <Shield className="h-3 w-3 mr-1" />
        Checking...
      </Badge>
    );
  }

  return (
    <Badge 
      variant={getStatusColor(status.level) as any}
      className="cursor-pointer"
      title={status.details}
      onClick={() => {
        if (status.details) {
          toast({
            title: status.message,
            description: status.details,
            variant: status.level === 'critical' ? 'destructive' : 'default'
          });
        }
      }}
    >
      {getStatusIcon(status.level)}
      <span className="ml-1 text-xs">{status.message}</span>
    </Badge>
  );
};
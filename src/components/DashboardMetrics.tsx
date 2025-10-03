import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Shield 
} from 'lucide-react';

interface DashboardMetricsProps {
  totalAlerts: number;
  highPriorityCount: number;
  newUpdatesCount: number;
  agenciesCount: number;
  dateRangeLabel: string;
  onMetricClick: (filter: string) => void;
}

export function DashboardMetrics({ 
  totalAlerts, 
  highPriorityCount, 
  newUpdatesCount,
  agenciesCount,
  dateRangeLabel,
  onMetricClick 
}: DashboardMetricsProps) {
  const metrics = [
    {
      id: 'new-updates',
      title: 'New Updates',
      value: newUpdatesCount,
      description: 'Last 24 hours • Click to filter',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-200',
      onClick: () => onMetricClick('new-updates')
    },
    {
      id: 'high-priority',
      title: 'High Priority',
      value: highPriorityCount,
      description: 'Require attention • Click to filter',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      borderColor: 'border-red-200',
      onClick: () => onMetricClick('high-priority')
    },
    {
      id: 'active-alerts',
      title: 'Active Alerts',
      value: totalAlerts,
      description: `${dateRangeLabel} • Click to filter`,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
      onClick: () => onMetricClick('active-alerts')
    },
    {
      id: 'coverage',
      title: 'Coverage',
      value: agenciesCount,
      description: 'Agencies monitored • Click for details',
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-200',
      onClick: () => onMetricClick('coverage')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card 
            key={metric.id}
            className={`cursor-pointer transition-colors border ${metric.borderColor} ${metric.bgColor}`}
            onClick={metric.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Activity, BarChart3 } from 'lucide-react';

interface RiskMetric {
  title: string;
  value: number;
  change: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export function RiskIntelligenceDashboard() {
  const riskMetrics: RiskMetric[] = [
    {
      title: 'Contamination Risk',
      value: 65,
      change: -5,
      severity: 'medium',
      description: 'E.coli incidents trending down this quarter'
    },
    {
      title: 'Supply Chain Risk',
      value: 78,
      change: 12,
      severity: 'high',
      description: 'Increased vendor compliance issues'
    },
    {
      title: 'Regulatory Risk',
      value: 45,
      change: -8,
      severity: 'low',
      description: 'Good compliance with recent FDA updates'
    },
    {
      title: 'Market Risk',
      value: 89,
      change: 3,
      severity: 'critical',
      description: 'Multiple competitor recalls affecting sector'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Shield className="h-4 w-4 text-green-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Risk Intelligence Dashboard</h2>
        <p className="text-muted-foreground">
          AI-powered risk assessment and predictive analytics for your operations
        </p>
      </div>

      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {riskMetrics.map((metric, index) => (
          <Card key={index} className="border-l-4" style={{ borderLeftColor: getSeverityColor(metric.severity).replace('bg-', '') }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getSeverityIcon(metric.severity)}
                  {metric.title}
                </CardTitle>
                <Badge 
                  variant="secondary" 
                  className={`${getSeverityColor(metric.severity)} text-white`}
                >
                  {metric.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{metric.value}%</span>
                  <div className="flex items-center gap-1 text-sm">
                    {metric.change > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    )}
                    <span className={metric.change > 0 ? 'text-red-500' : 'text-green-500'}>
                      {Math.abs(metric.change)}%
                    </span>
                  </div>
                </div>
                
                <Progress value={metric.value} className="h-2" />
                
                <p className="text-sm text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Analysis Summary</CardTitle>
          <CardDescription>
            Key insights and recommendations based on current risk factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-800">Critical Alert</h4>
              </div>
              <p className="text-red-700 text-sm">
                Market risk is at critical levels due to multiple competitor recalls. 
                Consider enhanced quality controls and proactive customer communication.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <h4 className="font-semibold text-orange-800">Supply Chain Warning</h4>
              </div>
              <p className="text-orange-700 text-sm">
                Supply chain risk trending upward. Review vendor audits and consider 
                diversifying supplier base for critical components.
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Regulatory Compliance</h4>
              </div>
              <p className="text-green-700 text-sm">
                Strong regulatory compliance performance. Continue current practices 
                and monitor upcoming regulation changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Predictive Analytics</CardTitle>
          <CardDescription>
            AI-powered forecasting for the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-semibold mb-2">Advanced Analytics Coming Soon</h4>
            <p className="text-muted-foreground text-sm">
              Predictive modeling, trend analysis, and automated risk scoring 
              are in development for enterprise users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
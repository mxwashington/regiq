import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Shield, Activity } from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';

const RiskDashboardPage: React.FC = () => {
  useAuthGuard();
  // Sample data for the chart
  const categoryRiskData = [
    { category: 'Vegetables', avgRisk: 2.4, color: '#ef4444' },
    { category: 'Meat', avgRisk: 2.6, color: '#f97316' },
    { category: 'Dairy', avgRisk: 2.2, color: '#eab308' },
    { category: 'Seafood', avgRisk: 2.8, color: '#ef4444' },
    { category: 'Packaged', avgRisk: 2.1, color: '#22c55e' },
    { category: 'Beverages', avgRisk: 1.8, color: '#22c55e' },
    { category: 'Bakery', avgRisk: 2.0, color: '#22c55e' },
    { category: 'Frozen', avgRisk: 1.9, color: '#22c55e' }
  ];

  // Sample hazard data
  const hazardData = [
    { type: 'Biological', frequency: 156, percentage: 62, trend: 'up' },
    { type: 'Chemical', frequency: 67, percentage: 27, trend: 'down' },
    { type: 'Physical', frequency: 28, percentage: 11, trend: 'stable' }
  ];

  const keyInsights = [
    {
      title: 'Seafood Shows Highest Risk',
      description: 'Average risk score of 2.8, primarily due to bacterial contamination concerns',
      icon: AlertTriangle,
      severity: 'high'
    },
    {
      title: 'Biological Hazards Increasing',
      description: '15% increase in pathogen-related incidents compared to last quarter',
      icon: TrendingUp,
      severity: 'medium'
    },
    {
      title: 'Packaged Foods Improving',
      description: 'Enhanced processing controls have reduced risk scores by 12%',
      icon: Shield,
      severity: 'low'
    },
    {
      title: 'Temperature Control Critical',
      description: '78% of high-risk incidents involve temperature abuse during transport',
      icon: Activity,
      severity: 'medium'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Average Risk: </span>
            <span className="font-medium">{data.avgRisk.toFixed(1)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Risk Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor food safety trends, risk patterns, and insights across product categories.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Risk by Category Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Average Risk Scores by Product Category
              </CardTitle>
              <CardDescription>
                Risk assessment averages across different food categories (Scale: 1.0 - 3.0)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryRiskData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="category" 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      domain={[1, 3]}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip content={customTooltip} />
                    <Bar 
                      dataKey="avgRisk" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hazard Types Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Hazard Type Analysis
                </CardTitle>
                <CardDescription>
                  Distribution of food safety hazards by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hazard Type</TableHead>
                      <TableHead className="text-center">Frequency</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hazardData.map((hazard) => (
                      <TableRow key={hazard.type}>
                        <TableCell className="font-medium">{hazard.type}</TableCell>
                        <TableCell className="text-center">{hazard.frequency}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {hazard.percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-lg">
                          {getTrendIcon(hazard.trend)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Key Insights
                </CardTitle>
                <CardDescription>
                  Important trends and recommendations from recent data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {keyInsights.map((insight, index) => {
                    const Icon = insight.icon;
                    return (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium mb-1">{insight.title}</h4>
                            <p className="text-sm opacity-90">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">2.3</div>
                    <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">251</div>
                    <p className="text-sm text-muted-foreground">Total Incidents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">8</div>
                    <p className="text-sm text-muted-foreground">Categories Analyzed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">94%</div>
                    <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDashboardPage;
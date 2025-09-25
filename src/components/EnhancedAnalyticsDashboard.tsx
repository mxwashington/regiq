import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useComplianceAnalytics } from '@/hooks/useComplianceAnalytics';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { useTaskManagement } from '@/hooks/useTaskManagement';
import { useComplianceCalendar } from '@/hooks/useComplianceCalendar';
import { logger } from '@/lib/logger';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Target,
  Award,
  Calendar,
  Clock,
  Download,
  RefreshCw
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color?: string;
  benchmark?: { value: number; percentile: number; performance: string } | null;
}> = ({ title, value, change, changeLabel, icon: Icon, color = 'blue', benchmark }) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-600 bg-green-50';
      case 'red': return 'text-red-600 bg-red-50';
      case 'orange': return 'text-orange-600 bg-orange-50';
      case 'purple': return 'text-purple-600 bg-purple-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              {change !== undefined && (
                <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
            {changeLabel && (
              <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
            )}
            {benchmark && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Industry {benchmark.percentile}th percentile</span>
                  <Badge variant={benchmark.performance === 'Excellent' ? 'default' : 'outline'} className="text-xs">
                    {benchmark.performance}
                  </Badge>
                </div>
                <Progress value={benchmark.percentile} className="h-1 mt-1" />
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${getColorClasses(color)}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ComplianceMaturitySection: React.FC<{ maturityData: any }> = ({ maturityData }) => {
  if (!maturityData) return null;

  const getMaturityLevel = (score: number) => {
    if (score >= 90) return { level: 'Optimized', color: 'green', description: 'Industry-leading compliance practices' };
    if (score >= 75) return { level: 'Managed', color: 'blue', description: 'Well-structured compliance processes' };
    if (score >= 60) return { level: 'Defined', color: 'orange', description: 'Documented compliance procedures' };
    if (score >= 40) return { level: 'Repeatable', color: 'yellow', description: 'Basic compliance processes in place' };
    return { level: 'Initial', color: 'red', description: 'Ad-hoc compliance activities' };
  };

  const maturity = getMaturityLevel(maturityData.overall_score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Compliance Maturity Assessment
        </CardTitle>
        <CardDescription>
          Overall assessment of your compliance program maturity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{maturityData.overall_score}/100</div>
            <Badge className={`mb-2 ${maturity.color === 'green' ? 'bg-green-100 text-green-800' : 
              maturity.color === 'blue' ? 'bg-blue-100 text-blue-800' :
              maturity.color === 'orange' ? 'bg-orange-100 text-orange-800' :
              maturity.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'}`}>
              {maturity.level}
            </Badge>
            <p className="text-sm text-muted-foreground">{maturity.description}</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Task Completion Rate</span>
              <span className="font-medium">{maturityData.task_completion_rate}%</span>
            </div>
            <Progress value={maturityData.task_completion_rate} className="h-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Deadline Completion Rate</span>
              <span className="font-medium">{maturityData.deadline_completion_rate}%</span>
            </div>
            <Progress value={maturityData.deadline_completion_rate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold text-lg">{maturityData.total_tasks}</div>
              <div className="text-muted-foreground">Active Tasks</div>
            </div>
            <div>
              <div className="font-semibold text-lg">{maturityData.total_deadlines}</div>
              <div className="text-muted-foreground">Tracked Deadlines</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RiskAssessmentSection: React.FC<{ riskData: any }> = ({ riskData }) => {
  if (!riskData) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Risk Assessment
        </CardTitle>
        <CardDescription>
          Current compliance risk evaluation and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{riskData.overall_risk_score}</div>
            <Badge className={`mb-2 ${getRiskColor(riskData.risk_level)}`}>
              {riskData.risk_level} Risk
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div className="p-3 bg-muted/50 rounded">
              <div className="font-semibold text-lg text-red-600">{riskData.overdue_tasks}</div>
              <div className="text-muted-foreground">Overdue Tasks</div>
            </div>
            <div className="p-3 bg-muted/50 rounded">
              <div className="font-semibold text-lg text-red-600">{riskData.overdue_deadlines}</div>
              <div className="text-muted-foreground">Missed Deadlines</div>
            </div>
          </div>

          {riskData.recommendations && riskData.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Recommendations</h4>
              <ul className="space-y-1 text-sm">
                {riskData.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CostAnalysisSection: React.FC<{ costData: any }> = ({ costData }) => {
  if (!costData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cost-Benefit Analysis
        </CardTitle>
        <CardDescription>
          Monthly compliance costs and potential savings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">${costData.total_cost}</div>
              <div className="text-sm text-muted-foreground">Monthly Costs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">${costData.total_savings}</div>
              <div className="text-sm text-muted-foreground">Potential Savings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{costData.roi_percentage}%</div>
              <div className="text-sm text-muted-foreground">ROI</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Cost Breakdown</h4>
            {Object.entries(costData.estimated_costs).map(([category, cost]: [string, any]) => (
              <div key={category} className="flex justify-between items-center text-sm">
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span className="font-medium">${cost}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Potential Savings</h4>
            {Object.entries(costData.potential_savings).map(([category, savings]: [string, any]) => (
              <div key={category} className="flex justify-between items-center text-sm">
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span className="font-medium text-green-600">${savings}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50 rounded text-center">
            <div className="font-medium text-blue-900">Net Monthly Benefit</div>
            <div className="text-2xl font-bold text-blue-600">${costData.net_benefit}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const EnhancedAnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [maturityData, setMaturityData] = useState<any>(null);
  const [riskData, setRiskData] = useState<any>(null);
  const [costData, setCostData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<any>(null);

  const { 
    generateComplianceMaturity,
    generateRiskAssessment,
    generateCostAnalysis,
    generateRegulatoryTrends,
    saveReport,
    compareWithBenchmarks
  } = useComplianceAnalytics();
  
  const { checkFeatureAccess } = usePlanRestrictions();
  const { getTaskStats } = useTaskManagement();
  const { getDeadlineStats } = useComplianceCalendar();

  const hasAnalyticsAccess = checkFeatureAccess('enhanced_analytics');
  
  const taskStats = getTaskStats();
  const deadlineStats = getDeadlineStats();

  // Generate all analytics
  const generateAllAnalytics = async () => {
    setLoading(true);
    try {
      const [maturity, risk, cost, trends] = await Promise.all([
        generateComplianceMaturity(),
        generateRiskAssessment(),
        generateCostAnalysis(),
        generateRegulatoryTrends({
          start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
          end: format(new Date(), 'yyyy-MM-dd')
        })
      ]);

      setMaturityData(maturity);
      setRiskData(risk);
      setCostData(cost);
      setTrendsData(trends);
    } catch (error) {
      logger.error('Error generating analytics:', error, 'EnhancedAnalyticsDashboard');
    } finally {
      setLoading(false);
    }
  };

  // Save executive summary report
  const saveExecutiveSummary = async () => {
    if (!maturityData || !riskData || !costData) return;

    const reportData = {
      maturity: maturityData,
      risk: riskData,
      cost: costData,
      trends: trendsData,
      generated_date: new Date().toISOString()
    };

    await saveReport('executive_summary', `Executive Summary - ${format(new Date(), 'MMM yyyy')}`, reportData);
  };

  useEffect(() => {
    if (hasAnalyticsAccess) {
      generateAllAnalytics();
    }
  }, [hasAnalyticsAccess]);

  if (!hasAnalyticsAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Enhanced Analytics Dashboard</h3>
              <p className="text-muted-foreground mb-4">
                Advanced compliance analytics with maturity scoring, benchmarking, and executive reporting.
              </p>
              <Badge variant="outline" className="mb-4">Professional Plan Required</Badge>
            </div>
            <Button>Upgrade to Access Advanced Analytics</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced compliance analytics and performance insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateAllAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm" onClick={saveExecutiveSummary} disabled={!maturityData}>
            <Download className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Task Completion Rate"
          value={`${taskStats.completionRate}%`}
          icon={CheckCircle}
          color="green"
          benchmark={compareWithBenchmarks(taskStats.completionRate, 'completion_rate') ? {
            value: compareWithBenchmarks(taskStats.completionRate, 'completion_rate')!.user_value,
            percentile: compareWithBenchmarks(taskStats.completionRate, 'completion_rate')!.user_percentile,
            performance: compareWithBenchmarks(taskStats.completionRate, 'completion_rate')!.performance
          } : null}
        />
        <MetricCard
          title="Avg Response Time"
          value="4.2 days"
          icon={Clock}
          color="blue"
          benchmark={compareWithBenchmarks(4.2, 'avg_response_time') ? {
            value: compareWithBenchmarks(4.2, 'avg_response_time')!.user_value,
            percentile: compareWithBenchmarks(4.2, 'avg_response_time')!.user_percentile,
            performance: compareWithBenchmarks(4.2, 'avg_response_time')!.performance
          } : null}
        />
        <MetricCard
          title="Overdue Items"
          value={taskStats.overdue + deadlineStats.overdue}
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          title="Monthly Savings"
          value={costData ? `$${costData.net_benefit}` : '$0'}
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="maturity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="maturity">Maturity</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="maturity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComplianceMaturitySection maturityData={maturityData} />
            <Card>
              <CardHeader>
                <CardTitle>Industry Benchmarking</CardTitle>
                <CardDescription>How you compare to industry peers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <Award className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-medium">Industry Ranking</div>
                    <div className="text-2xl font-bold text-blue-600">Top 25%</div>
                    <div className="text-sm text-muted-foreground">Food Manufacturing</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Response Time</span>
                      <Badge variant="outline">Above Average</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Rate</span>
                      <Badge>Excellent</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Management</span>
                      <Badge variant="outline">Good</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <RiskAssessmentSection riskData={riskData} />
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <CostAnalysisSection costData={costData} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Trends (Last 30 Days)</CardTitle>
              <CardDescription>Analysis of regulatory activity and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{trendsData.total_alerts}</div>
                      <div className="text-sm text-muted-foreground">Total Alerts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {Object.keys(trendsData.agency_breakdown).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Agencies</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {Math.round(trendsData.total_alerts / 30)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Daily</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round((trendsData.total_alerts / 30) * 7)}
                      </div>
                      <div className="text-sm text-muted-foreground">Weekly Trend</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Agency Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries(trendsData.agency_breakdown).map(([agency, data]: [string, any]) => (
                        <div key={agency} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="font-medium">{agency}</span>
                          <div className="flex items-center gap-2 text-sm">
                            <span>{data.total} alerts</span>
                            {data.high_urgency > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {data.high_urgency} high
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Generating regulatory trends analysis...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
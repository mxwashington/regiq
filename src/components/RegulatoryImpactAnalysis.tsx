import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  Clock,
  Target,
  BarChart3,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useRegulatoryImpactAnalysis } from '@/hooks/useRegulatoryImpactAnalysis';
import { Skeleton } from '@/components/ui/skeleton';

export const RegulatoryImpactAnalysis: React.FC = () => {
  const { impactAnalyses, impactSummary, loading } = useRegulatoryImpactAnalysis();
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTimelineColor = (urgency: string) => {
    switch (urgency) {
      case 'Immediate': return 'destructive';
      case 'Short-term': return 'default';
      case 'Medium-term': return 'secondary';
      case 'Long-term': return 'outline';
      default: return 'outline';
    }
  };

  const getImpactIcon = (level: string) => {
    switch (level) {
      case 'Critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'High': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'Medium': return <TrendingUp className="h-4 w-4 text-warning" />;
      default: return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {impactSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{impactSummary.total_alerts}</p>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-destructive">
                    {impactSummary.critical_impact + impactSummary.high_impact}
                  </p>
                  <p className="text-sm text-muted-foreground">High Impact</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{impactSummary.medium_impact}</p>
                  <p className="text-sm text-muted-foreground">Medium Impact</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{impactSummary.top_agencies.length}</p>
                  <p className="text-sm text-muted-foreground">Active Agencies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Regulatory Impact Analysis</h2>
        <p className="text-muted-foreground">
          Analyze business impact of regulatory alerts and get actionable recommendations
        </p>
      </div>

      <Tabs defaultValue="impact-analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="impact-analysis">Impact Analysis</TabsTrigger>
          <TabsTrigger value="summary">Summary & Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="impact-analysis" className="space-y-4">
          {impactAnalyses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Impact Analysis Available</h3>
                <p className="text-muted-foreground">
                  Regulatory alerts will be analyzed here for business impact
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {impactAnalyses.slice(0, 10).map((analysis) => (
                <Card key={analysis.alert_id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getImpactIcon(analysis.impact_level)}
                          <CardTitle className="text-lg">{analysis.title}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{analysis.agency}</Badge>
                          <Badge variant={getImpactColor(analysis.impact_level) as any}>
                            {analysis.impact_level} Impact
                          </Badge>
                          <Badge variant={getTimelineColor(analysis.timeline_urgency) as any}>
                            {analysis.timeline_urgency}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{analysis.business_impact_score}</div>
                        <div className="text-sm text-muted-foreground">Impact Score</div>
                        <Progress 
                          value={analysis.business_impact_score} 
                          className="w-20 mt-1"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected Areas */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          Affected Areas
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {analysis.affected_areas.map((area, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Compliance Implications */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Compliance Implications
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {analysis.compliance_implications.slice(0, 2).map((implication, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0" />
                              {implication}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommended Actions */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Recommended Actions
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {analysis.recommended_actions.slice(0, 4).map((action, idx) => (
                          <div key={idx} className="flex items-center text-sm">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-2">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            {action}
                          </div>
                        ))}
                      </div>
                      {analysis.recommended_actions.length > 4 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{analysis.recommended_actions.length - 4} more actions
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(analysis.published_date).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Calendar className="h-4 w-4 mr-1" />
                          Add to Calendar
                        </Button>
                        <Button variant="outline" size="sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Create Task
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {impactSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Agencies */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Top Agencies by Impact
                  </CardTitle>
                  <CardDescription>
                    Agencies with highest average business impact
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {impactSummary.top_agencies.map((agency, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{agency.agency}</div>
                          <div className="text-sm text-muted-foreground">
                            {agency.count} alerts
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{agency.avg_impact}</div>
                          <Progress value={agency.avg_impact} className="w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Impact Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Impact Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of alerts by business impact level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-destructive rounded mr-2" />
                        <span>Critical Impact</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold mr-2">{impactSummary.critical_impact}</span>
                        <Progress 
                          value={(impactSummary.critical_impact / impactSummary.total_alerts) * 100} 
                          className="w-20"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-destructive/70 rounded mr-2" />
                        <span>High Impact</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold mr-2">{impactSummary.high_impact}</span>
                        <Progress 
                          value={(impactSummary.high_impact / impactSummary.total_alerts) * 100} 
                          className="w-20"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-warning rounded mr-2" />
                        <span>Medium Impact</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold mr-2">{impactSummary.medium_impact}</span>
                        <Progress 
                          value={(impactSummary.medium_impact / impactSummary.total_alerts) * 100} 
                          className="w-20"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-muted rounded mr-2" />
                        <span>Low Impact</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-bold mr-2">{impactSummary.low_impact}</span>
                        <Progress 
                          value={(impactSummary.low_impact / impactSummary.total_alerts) * 100} 
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
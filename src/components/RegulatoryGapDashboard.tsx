import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  Search,
  RefreshCw,
  Shield,
  Import,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Eye,
  ExternalLink
} from 'lucide-react';
import { useRegulatoryGapDetection } from '@/hooks/useRegulatoryGapDetection';
import { Skeleton } from '@/components/ui/skeleton';

export const RegulatoryGapDashboard: React.FC = () => {
  const { 
    processFailures, 
    importGaps, 
    gapIndicators, 
    loading, 
    analyzing, 
    runGapAnalysis 
  } = useRegulatoryGapDetection();

  const [selectedTab, setSelectedTab] = useState('overview');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'worsening': return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600 transform rotate-180" />;
      default: return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
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

  const criticalProcessFailures = processFailures.filter(pf => pf.severity_level === 'critical' || pf.severity_level === 'high');
  const highRiskImportGaps = importGaps.filter(ig => ig.potential_risk_level === 'high');
  const criticalIndicators = gapIndicators.filter(gi => gi.priority_level === 'high' && gi.risk_score >= 70);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Regulatory Gap Detection
          </h1>
          <p className="text-muted-foreground">
            AI-powered analysis to identify regulatory process failures and compliance gaps
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => runGapAnalysis(undefined, false)}
            disabled={analyzing}
            className="flex items-center gap-2"
          >
            {analyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{criticalProcessFailures.length}</p>
                <p className="text-sm text-muted-foreground">Critical Process Failures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Import className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{highRiskImportGaps.length}</p>
                <p className="text-sm text-muted-foreground">High-Risk Import Gaps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{gapIndicators.length}</p>
                <p className="text-sm text-muted-foreground">Gap Indicators</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{criticalIndicators.length}</p>
                <p className="text-sm text-muted-foreground">Critical Indicators</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="process-failures">Process Failures</TabsTrigger>
          <TabsTrigger value="import-gaps">Import Gaps</TabsTrigger>
          <TabsTrigger value="indicators">Risk Indicators</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {criticalIndicators.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Critical Risk Indicators
                </CardTitle>
                <CardDescription>
                  High-priority regulatory gaps requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {criticalIndicators.slice(0, 3).map((indicator) => (
                    <div key={indicator.id} className="flex items-start justify-between p-4 bg-destructive/5 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(indicator.trend_direction)}
                          <h4 className="font-medium">{indicator.gap_description}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">Risk Score: {indicator.risk_score}</Badge>
                          <Badge variant="outline">{indicator.indicator_type.replace('_', ' ')}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Affected: {indicator.affected_areas.join(', ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <Progress value={indicator.risk_score} className="w-24 mb-2" />
                        <p className="text-xs text-muted-foreground">{indicator.risk_score}% Risk</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Process Failures */}
          {processFailures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Recent Process Failures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processFailures.slice(0, 5).map((failure) => (
                    <div key={failure.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(failure.severity_level) as any}>
                            {failure.severity_level}
                          </Badge>
                          <span className="font-medium">{failure.failure_type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Systems: {failure.affected_systems.join(', ')}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(failure.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="process-failures" className="space-y-4">
          {processFailures.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Process Failures Detected</h3>
                <p className="text-muted-foreground">
                  Run analysis to detect regulatory process breakdown patterns
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {processFailures.map((failure) => (
                <Card key={failure.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <CardTitle className="text-lg">{failure.failure_type.replace('_', ' ').toUpperCase()}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(failure.severity_level) as any}>
                            {failure.severity_level} Severity
                          </Badge>
                          <Badge variant="outline">{failure.failure_category}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Confidence: {failure.trend_indicators.pattern_confidence || 0}%
                        </div>
                        <Progress 
                          value={failure.trend_indicators.pattern_confidence || 0} 
                          className="w-20 mt-1"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected Systems */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          Affected Systems
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {failure.affected_systems.map((system, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Root Causes */}
                      {failure.root_cause_analysis.identified_causes && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Root Causes
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {failure.root_cause_analysis.identified_causes.map((cause, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0" />
                                {cause}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(failure.created_at).toLocaleDateString()}
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Alert
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="import-gaps" className="space-y-4">
          {importGaps.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Import className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Import Gaps Detected</h3>
                <p className="text-muted-foreground">
                  Run analysis to identify import compliance vulnerabilities
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {importGaps.map((gap) => (
                <Card key={gap.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Import className="h-5 w-5 text-warning" />
                          <CardTitle className="text-lg">{gap.gap_type.replace('_', ' ').toUpperCase()}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRiskLevelColor(gap.potential_risk_level) as any}>
                            {gap.potential_risk_level} Risk
                          </Badge>
                          <Badge variant="outline">{gap.product_type}</Badge>
                          {gap.origin_country && (
                            <Badge variant="secondary">{gap.origin_country}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{gap.timeline_to_fix.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Missed Requirements */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Missed Requirements
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {gap.compliance_requirements_missed.map((req, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Remediation Actions */}
                    {gap.remediation_needed.immediate_actions && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Immediate Actions
                        </h4>
                        <div className="space-y-1">
                          {gap.remediation_needed.immediate_actions.map((action, idx) => (
                            <div key={idx} className="flex items-center text-sm">
                              <CheckCircle className="h-3 w-3 mr-2 text-muted-foreground" />
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(gap.created_at).toLocaleDateString()}
                        {gap.importer_name && (
                          <span className="ml-2">• {gap.importer_name}</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          {gapIndicators.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Risk Indicators</h3>
                <p className="text-muted-foreground">
                  Gap indicators will appear here as patterns are detected
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {gapIndicators.map((indicator) => (
                <Card key={indicator.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(indicator.trend_direction)}
                          <CardTitle className="text-lg">{indicator.indicator_type.replace('_', ' ').toUpperCase()}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            indicator.priority_level === 'high' ? 'destructive' : 
                            indicator.priority_level === 'medium' ? 'default' : 'secondary'
                          }>
                            {indicator.priority_level} Priority
                          </Badge>
                          <Badge variant="outline">{indicator.trend_direction}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{indicator.risk_score}</div>
                        <div className="text-sm text-muted-foreground">Risk Score</div>
                        <Progress value={indicator.risk_score} className="w-20 mt-1" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm mb-4">{indicator.gap_description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Affected Areas */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          Affected Areas
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {indicator.affected_areas.map((area, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Recommended Actions
                        </h4>
                        <div className="space-y-1">
                          {indicator.recommended_actions.slice(0, 3).map((action, idx) => (
                            <div key={idx} className="flex items-center text-sm">
                              <CheckCircle className="h-3 w-3 mr-2 text-muted-foreground" />
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        Updated: {new Date(indicator.last_updated_at).toLocaleDateString()}
                        <span className="ml-2">• {indicator.evidence_alerts.length} supporting alerts</span>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Evidence
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
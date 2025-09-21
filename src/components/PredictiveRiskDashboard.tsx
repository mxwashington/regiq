import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, TrendingUp, Target, Brain, Activity, Eye, BarChart3 } from 'lucide-react';
import { usePredictiveRiskModeling, RiskPrediction, RiskPattern } from '@/hooks/usePredictiveRiskModeling';
import { useToast } from '@/hooks/use-toast';

export const PredictiveRiskDashboard: React.FC = () => {
  const {
    loading,
    predictions,
    patterns,
    generateRiskPrediction,
    fetchRiskPredictions,
    fetchRiskPatterns,
    getRiskScoreColor,
    getRiskScoreLabel,
    getConfidenceLabel
  } = usePredictiveRiskModeling();

  const { toast } = useToast();
  const [selectedEntityType, setSelectedEntityType] = useState<'supplier' | 'facility' | 'compliance_area' | 'regulatory_change'>('supplier');
  const [entityId, setEntityId] = useState('');
  const [predictionHorizon, setPredictionHorizon] = useState(30);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  useEffect(() => {
    fetchRiskPredictions();
    fetchRiskPatterns();
  }, [fetchRiskPredictions, fetchRiskPatterns]);

  const handleGeneratePrediction = async () => {
    if (!entityId.trim()) {
      toast({
        title: "Entity ID Required",
        description: "Please enter an entity ID to generate a risk prediction.",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateRiskPrediction(selectedEntityType, entityId.trim(), predictionHorizon, true);
      setIsGenerateDialogOpen(false);
      setEntityId('');
    } catch (error) {
      // Error already handled in the hook
    }
  };

  const getRiskScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'destructive';
    if (score >= 60) return 'default';
    if (score >= 40) return 'secondary';
    return 'outline';
  };

  const latestPredictions = predictions.slice(0, 5);
  const highRiskPredictions = predictions.filter(p => p.riskScore >= 70);
  const averageRiskScore = predictions.length > 0 
    ? predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Predictive Risk Modeling
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered risk assessment and prediction for proactive compliance management
          </p>
        </div>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Generate Prediction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Risk Prediction</DialogTitle>
              <DialogDescription>
                Create an AI-powered risk assessment for a specific entity
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="entityType">Entity Type</Label>
                <Select value={selectedEntityType} onValueChange={(value: any) => setSelectedEntityType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="facility">Facility</SelectItem>
                    <SelectItem value="compliance_area">Compliance Area</SelectItem>
                    <SelectItem value="regulatory_change">Regulatory Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="entityId">Entity ID</Label>
                <Input
                  id="entityId"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="Enter entity identifier"
                />
              </div>
              <div>
                <Label htmlFor="horizon">Prediction Horizon (days)</Label>
                <Input
                  id="horizon"
                  type="number"
                  value={predictionHorizon}
                  onChange={(e) => setPredictionHorizon(parseInt(e.target.value) || 30)}
                  min={1}
                  max={365}
                />
              </div>
              <Button 
                onClick={handleGeneratePrediction} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Generating...' : 'Generate Prediction'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictions.length}</div>
            <p className="text-xs text-muted-foreground">Active risk assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highRiskPredictions.length}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskScoreColor(averageRiskScore)}`}>
              {averageRiskScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all entities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Patterns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.length}</div>
            <p className="text-xs text-muted-foreground">Identified patterns</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Latest Risk Predictions
          </CardTitle>
          <CardDescription>
            Most recent AI-generated risk assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestPredictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No risk predictions available yet.</p>
              <p className="text-sm">Generate your first prediction to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {latestPredictions.map((prediction) => (
                <div key={prediction.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {prediction.entityType.replace('_', ' ')}
                      </Badge>
                      <span className="font-medium">{prediction.entityId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRiskScoreBadgeVariant(prediction.riskScore)}>
                        {getRiskScoreLabel(prediction.riskScore)} ({prediction.riskScore.toFixed(1)}%)
                      </Badge>
                      <Badge variant="secondary">
                        {getConfidenceLabel(prediction.confidenceLevel)} Confidence
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Risk Factors */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Key Risk Factors:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {Object.entries(prediction.riskFactors).map(([key, factor]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/[A-Z]/g, ' $&').toLowerCase()}:
                          </span>
                          <span className="font-medium">
                            {factor.riskContribution?.toFixed(1)}% impact
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {prediction.mitigationRecommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recommended Actions:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {prediction.mitigationRecommendations.slice(0, 2).map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    Predicted {new Date(prediction.predictedAt).toLocaleDateString()} • 
                    {prediction.predictionHorizon} day horizon • 
                    Model {prediction.modelVersion}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Identified Risk Patterns
            </CardTitle>
            <CardDescription>
              Historical patterns that inform future risk predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.slice(0, 6).map((pattern) => (
                <div key={pattern.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">
                      {pattern.patternType.replace(/_/g, ' ')}
                    </h4>
                    <Badge variant="outline">
                      {pattern.frequency}x observed
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Impact Score:</span>
                      <span className={`font-medium ${getRiskScoreColor(pattern.impactScore)}`}>
                        {pattern.impactScore.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">
                        {(pattern.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discovery:</span>
                      <span className="font-medium capitalize">
                        {pattern.discoveryMethod.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
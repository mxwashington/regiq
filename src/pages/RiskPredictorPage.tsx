import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface RiskResult {
  score: number;
  level: 'Low Risk' | 'Medium Risk' | 'High Risk';
  color: string;
  recommendations: string[];
}

const RiskPredictorPage: React.FC = () => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState<RiskResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const categories = [
    'Vegetables',
    'Dairy',
    'Meat',
    'Packaged Meals',
    'Seafood',
    'Beverages',
    'Bakery Products',
    'Frozen Foods'
  ];

  const calculateRisk = (desc: string, cat: string): RiskResult => {
    let baseRisk = 2.0;
    
    // Category-based baseline
    if (['Vegetables', 'Meat', 'Seafood'].includes(cat)) {
      baseRisk = 2.4;
    } else if (['Dairy', 'Packaged Meals'].includes(cat)) {
      baseRisk = 2.6;
    }
    
    // Keyword adjustments
    const lowerDesc = desc.toLowerCase();
    if (lowerDesc.includes('listeria') || lowerDesc.includes('salmonella')) {
      baseRisk += 0.2;
    }
    if (lowerDesc.includes('e. coli') || lowerDesc.includes('ecoli')) {
      baseRisk += 0.3;
    }
    if (lowerDesc.includes('pasteurized')) {
      baseRisk -= 0.1;
    }
    if (lowerDesc.includes('organic') || lowerDesc.includes('certified')) {
      baseRisk -= 0.1;
    }
    if (lowerDesc.includes('raw') || lowerDesc.includes('unpasteurized')) {
      baseRisk += 0.2;
    }
    
    // Cap between 1.0 and 3.0
    const finalScore = Math.max(1.0, Math.min(3.0, baseRisk));
    
    let level: 'Low Risk' | 'Medium Risk' | 'High Risk';
    let color: string;
    let recommendations: string[];
    
    if (finalScore <= 2.0) {
      level = 'Low Risk';
      color = 'text-green-600';
      recommendations = [
        'Maintain current quality control procedures',
        'Continue regular supplier audits',
        'Monitor temperature control during transport',
        'Keep documentation up to date'
      ];
    } else if (finalScore <= 2.5) {
      level = 'Medium Risk';
      color = 'text-yellow-600';
      recommendations = [
        'Implement enhanced testing protocols',
        'Increase frequency of supplier inspections',
        'Review and update HACCP plans',
        'Consider additional staff training on food safety',
        'Monitor for regulatory updates more closely'
      ];
    } else {
      level = 'High Risk';
      color = 'text-red-600';
      recommendations = [
        'Immediate review of all safety protocols',
        'Consider temporary supplier changes',
        'Implement daily testing procedures',
        'Engage with food safety consultants',
        'Prepare recall procedures and documentation',
        'Increase insurance coverage if applicable'
      ];
    }
    
    return {
      score: Math.round(finalScore * 10) / 10,
      level,
      color,
      recommendations
    };
  };

  const handleAnalyze = async () => {
    if (!description.trim() || !category) {
      toast({
        title: "Missing Information",
        description: "Please provide both product description and category.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const riskResult = calculateRisk(description, category);
    setResult(riskResult);
    setIsAnalyzing(false);
    
    toast({
      title: "Analysis Complete",
      description: `Risk assessment completed for ${category} product.`
    });
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Low Risk':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'Medium Risk':
        return <Info className="h-8 w-8 text-yellow-600" />;
      case 'High Risk':
        return <AlertTriangle className="h-8 w-8 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Food Recall Risk Predictor
          </h1>
          <p className="text-muted-foreground">
            Analyze your product descriptions to predict potential food safety risks and get actionable recommendations.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Product Analysis
              </CardTitle>
              <CardDescription>
                Enter your product details for risk assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Product Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product, ingredients, processing methods, packaging, etc. Include any relevant details about sourcing, handling, or storage..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Product Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !description.trim() || !category}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Risk'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment Results</CardTitle>
              <CardDescription>
                {result ? 'Analysis complete' : 'Enter product details to see risk assessment'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  {/* Risk Score Display */}
                  <div className="text-center p-6 border rounded-lg">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      {getRiskIcon(result.level)}
                      <div>
                        <div className={`text-4xl font-bold ${result.color}`}>
                          {result.score}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          out of 3.0
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${result.color} border-current`}
                    >
                      {result.level}
                    </Badge>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Recommended Actions:</h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Complete the form to see your risk assessment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">How Risk Scores Are Calculated:</p>
                <p>
                  Our algorithm analyzes product descriptions, categories, and known risk factors to provide a preliminary assessment. 
                  This tool is designed to supplement, not replace, professional food safety expertise and regulatory compliance protocols.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskPredictorPage;
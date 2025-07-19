import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  MapPin, 
  Building, 
  AlertTriangle, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Globe
} from 'lucide-react';
import { fdaApi, FDAEnforcementResult } from '@/lib/fda-api';
import { useToast } from '@/hooks/use-toast';

interface TrendData {
  month: string;
  classI: number;
  classII: number;
  classIII: number;
  total: number;
}

interface GeographicData {
  state: string;
  recalls: number;
  classI: number;
  riskScore: number;
}

interface CompanyRiskData {
  company: string;
  totalRecalls: number;
  classIRecalls: number;
  riskScore: number;
  avgDaysBetweenRecalls: number;
  categories: string[];
}

interface ProductCategoryData {
  category: string;
  recalls: number;
  riskLevel: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
}

export function FDAAnalyticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('12months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [geographicData, setGeographicData] = useState<GeographicData[]>([]);
  const [companyRiskData, setCompanyRiskData] = useState<CompanyRiskData[]>([]);
  const [productCategoryData, setProductCategoryData] = useState<ProductCategoryData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRecalls: 0,
    classIRecalls: 0,
    topRiskState: '',
    topRiskCompany: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, selectedCategory]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const months = timeRange === '6months' ? 6 : timeRange === '12months' ? 12 : 24;
      startDate.setMonth(endDate.getMonth() - months);

      // Fetch FDA data for analysis
      const dateQuery = `recall_initiation_date:[${startDate.toISOString().split('T')[0]}+TO+${endDate.toISOString().split('T')[0]}]`;
      
      const [foodData, drugData, deviceData] = await Promise.allSettled([
        fdaApi.searchFoodEnforcement({ search: dateQuery, limit: 1000 }),
        fdaApi.searchDrugEnforcement({ search: dateQuery, limit: 1000 }),
        fdaApi.searchDeviceEnforcement({ search: dateQuery, limit: 1000 })
      ]);

      // Combine all enforcement data
      const allRecalls: FDAEnforcementResult[] = [];
      if (foodData.status === 'fulfilled') allRecalls.push(...foodData.value.results);
      if (drugData.status === 'fulfilled') allRecalls.push(...drugData.value.results);
      if (deviceData.status === 'fulfilled') allRecalls.push(...deviceData.value.results);

      // Process data for analytics
      processAnalyticsData(allRecalls);

      toast({
        title: "Analytics Updated",
        description: `Analyzed ${allRecalls.length} FDA records`,
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to load FDA analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (recalls: FDAEnforcementResult[]) => {
    // Process trend data
    const trends = processTrendData(recalls);
    setTrendData(trends);

    // Process geographic data
    const geographic = processGeographicData(recalls);
    setGeographicData(geographic);

    // Process company risk data
    const companyRisk = processCompanyRiskData(recalls);
    setCompanyRiskData(companyRisk);

    // Process product category data
    const productCategories = processProductCategoryData(recalls);
    setProductCategoryData(productCategories);

    // Calculate total stats
    const stats = {
      totalRecalls: recalls.length,
      classIRecalls: recalls.filter(r => r.classification === 'Class I').length,
      topRiskState: geographic.length > 0 ? geographic[0].state : '',
      topRiskCompany: companyRisk.length > 0 ? companyRisk[0].company : ''
    };
    setTotalStats(stats);
  };

  const processTrendData = (recalls: FDAEnforcementResult[]): TrendData[] => {
    const monthlyData = new Map<string, { classI: number; classII: number; classIII: number }>();
    
    recalls.forEach(recall => {
      const date = new Date(recall.recall_initiation_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { classI: 0, classII: 0, classIII: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      switch (recall.classification) {
        case 'Class I': data.classI++; break;
        case 'Class II': data.classII++; break;
        case 'Class III': data.classIII++; break;
      }
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        total: data.classI + data.classII + data.classIII
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  };

  const processGeographicData = (recalls: FDAEnforcementResult[]): GeographicData[] => {
    const stateData = new Map<string, { total: number; classI: number }>();
    
    recalls.forEach(recall => {
      if (!recall.state) return;
      
      if (!stateData.has(recall.state)) {
        stateData.set(recall.state, { total: 0, classI: 0 });
      }
      
      const data = stateData.get(recall.state)!;
      data.total++;
      if (recall.classification === 'Class I') data.classI++;
    });

    return Array.from(stateData.entries())
      .map(([state, data]) => ({
        state,
        recalls: data.total,
        classI: data.classI,
        riskScore: Math.round((data.classI / data.total) * 100)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20); // Top 20 states
  };

  const processCompanyRiskData = (recalls: FDAEnforcementResult[]): CompanyRiskData[] => {
    const companyData = new Map<string, {
      total: number;
      classI: number;
      dates: Date[];
      categories: Set<string>;
    }>();
    
    recalls.forEach(recall => {
      if (!recall.company_name) return;
      
      const company = recall.company_name.toUpperCase().trim();
      if (!companyData.has(company)) {
        companyData.set(company, { 
          total: 0, 
          classI: 0, 
          dates: [], 
          categories: new Set() 
        });
      }
      
      const data = companyData.get(company)!;
      data.total++;
      if (recall.classification === 'Class I') data.classI++;
      data.dates.push(new Date(recall.recall_initiation_date));
      
      // Extract product category
      const product = recall.product_description?.toLowerCase() || '';
      if (product.includes('food') || product.includes('meat')) data.categories.add('Food');
      else if (product.includes('drug') || product.includes('medication')) data.categories.add('Drug');
      else if (product.includes('device') || product.includes('medical')) data.categories.add('Device');
      else data.categories.add('Other');
    });

    return Array.from(companyData.entries())
      .filter(([_, data]) => data.total >= 2) // Companies with 2+ recalls
      .map(([company, data]) => {
        const avgDays = data.dates.length > 1 
          ? Math.round((Math.max(...data.dates.map(d => d.getTime())) - Math.min(...data.dates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24) / (data.dates.length - 1))
          : 0;
        
        const riskScore = Math.round(
          (data.classI / data.total) * 50 + // Class I percentage (50% weight)
          (data.total / 10) * 30 + // Total recalls (30% weight)
          (avgDays > 0 ? Math.max(0, 100 - avgDays) / 5 : 0) * 20 // Frequency (20% weight)
        );

        return {
          company,
          totalRecalls: data.total,
          classIRecalls: data.classI,
          riskScore: Math.min(100, riskScore),
          avgDaysBetweenRecalls: avgDays,
          categories: Array.from(data.categories)
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 15); // Top 15 companies
  };

  const processProductCategoryData = (recalls: FDAEnforcementResult[]): ProductCategoryData[] => {
    const categories = ['Food Products', 'Pharmaceuticals', 'Medical Devices', 'Dietary Supplements', 'Cosmetics'];
    
    return categories.map(category => {
      const categoryRecalls = recalls.filter(recall => {
        const product = recall.product_description?.toLowerCase() || '';
        switch (category) {
          case 'Food Products': return product.includes('food') || product.includes('meat') || product.includes('produce');
          case 'Pharmaceuticals': return product.includes('drug') || product.includes('medication') || product.includes('tablet');
          case 'Medical Devices': return product.includes('device') || product.includes('implant') || product.includes('equipment');
          case 'Dietary Supplements': return product.includes('supplement') || product.includes('vitamin');
          case 'Cosmetics': return product.includes('cosmetic') || product.includes('cream') || product.includes('lotion');
          default: return false;
        }
      });

      const classICount = categoryRecalls.filter(r => r.classification === 'Class I').length;
      const riskLevel: 'high' | 'medium' | 'low' = classICount / Math.max(categoryRecalls.length, 1) > 0.3 ? 'high' : 
                       classICount / Math.max(categoryRecalls.length, 1) > 0.1 ? 'medium' : 'low';

      return {
        category,
        recalls: categoryRecalls.length,
        riskLevel,
        trend: 'stable' as const // Could be enhanced with historical comparison
      };
    }).filter(cat => cat.recalls > 0);
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100 border-red-200';
    if (score >= 40) return 'text-orange-600 bg-orange-100 border-orange-200';
    return 'text-green-600 bg-green-100 border-green-200';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>FDA Recall Analytics Dashboard</span>
          </CardTitle>
          <CardDescription>
            Comprehensive analysis of FDA enforcement actions and recall patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6months">Last 6 months</SelectItem>
                  <SelectItem value="12months">Last 12 months</SelectItem>
                  <SelectItem value="24months">Last 24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food Products</SelectItem>
                  <SelectItem value="drug">Pharmaceuticals</SelectItem>
                  <SelectItem value="device">Medical Devices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={loadAnalyticsData} disabled={loading} variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalStats.totalRecalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Recalls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{totalStats.classIRecalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Class I Recalls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalStats.topRiskState}</div>
            <p className="text-xs text-muted-foreground">Highest Risk State</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalStats.topRiskCompany.substring(0, 15)}...</div>
            <p className="text-xs text-muted-foreground">Highest Risk Company</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Recall Trends</TabsTrigger>
          <TabsTrigger value="geographic">Geographic Analysis</TabsTrigger>
          <TabsTrigger value="companies">Company Risk Scoring</TabsTrigger>
          <TabsTrigger value="categories">Product Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>FDA Recall Trends Over Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="classI" stackId="1" stroke="#ef4444" fill="#ef4444" name="Class I" />
                  <Area type="monotone" dataKey="classII" stackId="1" stroke="#f97316" fill="#f97316" name="Class II" />
                  <Area type="monotone" dataKey="classIII" stackId="1" stroke="#eab308" fill="#eab308" name="Class III" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Geographic Distribution of FDA Enforcement Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={geographicData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="state" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="recalls" fill="#8884d8" name="Total Recalls" />
                      <Bar dataKey="classI" fill="#ef4444" name="Class I Recalls" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Top Risk States</h4>
                  {geographicData.slice(0, 10).map((state, index) => (
                    <div key={state.state} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{state.state}</div>
                          <div className="text-sm text-muted-foreground">{state.recalls} total recalls</div>
                        </div>
                      </div>
                      <Badge className={getRiskColor(state.riskScore)}>
                        {state.riskScore}% Class I
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Company Risk Scoring & Recall History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companyRiskData.map((company, index) => (
                  <div key={company.company} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{company.company}</div>
                          <div className="text-sm text-muted-foreground">
                            {company.categories.join(', ')}
                          </div>
                        </div>
                      </div>
                      <Badge className={getRiskColor(company.riskScore)}>
                        {getRiskLabel(company.riskScore)} ({company.riskScore}/100)
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Recalls</div>
                        <div className="font-medium">{company.totalRecalls}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Class I Recalls</div>
                        <div className="font-medium text-red-600">{company.classIRecalls}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Days Between</div>
                        <div className="font-medium">{company.avgDaysBetweenRecalls || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChartIcon className="h-5 w-5" />
                <span>Product Category Risk Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, recalls }) => `${category}: ${recalls}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="recalls"
                    >
                      {productCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {productCategoryData.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{category.category}</div>
                        <div className="text-sm text-muted-foreground">{category.recalls} recalls</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={category.riskLevel === 'high' ? 'destructive' : category.riskLevel === 'medium' ? 'secondary' : 'default'}>
                          {category.riskLevel} risk
                        </Badge>
                        <Badge variant="outline">
                          {category.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
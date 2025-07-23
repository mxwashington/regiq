import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedRecallCard } from './EnhancedRecallCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Search, AlertTriangle, Sparkles } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  summary?: string;
  source: string;
  urgency?: number;
  published_date: string;
  external_url?: string;
}

export const EnhancedRecallDemo: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Sample recall alerts for demo
  const sampleRecalls: Alert[] = [
    {
      id: 'recall-1',
      title: 'Wells Enterprises Ice Cream Recall - Plastic Contamination',
      summary: 'Nationwide recall of nearly 18,000 tubs of ice cream and frozen yogurt due to possible plastic contamination affecting 22 flavors in three-gallon containers.',
      source: 'FDA',
      urgency: 9,
      published_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      external_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts'
    },
    {
      id: 'recall-2',
      title: 'Listeria Contamination in Frozen Dessert Products',
      summary: 'Totally Cool, Inc. recalled multiple frozen dessert and ice cream products under various brand names including Friendly\'s, Hershey\'s Ice Cream, and Jeni\'s due to potential Listeria contamination.',
      source: 'FDA',
      urgency: 8,
      published_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      external_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts'
    },
    {
      id: 'recall-3',
      title: 'Ground Beef Recall - E. coli O157:H7 Contamination',
      summary: 'Interstate Meat Dist. Inc. recalls approximately 1,200 pounds of ground beef products due to possible E. coli O157:H7 contamination.',
      source: 'USDA-FSIS',
      urgency: 10,
      published_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      external_url: 'https://www.fsis.usda.gov/recalls-alerts'
    }
  ];

  useEffect(() => {
    // Use sample recalls for demo
    setAlerts(sampleRecalls);
    setIsLoading(false);
  }, []);

  const handleSaveAlert = (alert: Alert) => {
    const isSaved = savedAlerts.some(saved => saved.id === alert.id);
    
    if (isSaved) {
      // Remove from saved
      setSavedAlerts(prev => prev.filter(saved => saved.id !== alert.id));
    } else {
      // Add to saved
      setSavedAlerts(prev => [...prev, alert]);
    }
  };

  const recallAlerts = alerts.filter(alert => 
    alert.title.toLowerCase().includes('recall') || 
    alert.summary?.toLowerCase().includes('recall') ||
    alert.source.includes('FDA') ||
    alert.source.includes('USDA')
  );

  const highUrgencyRecalls = recallAlerts.filter(alert => (alert.urgency || 0) >= 8);
  const recentRecalls = recallAlerts.filter(alert => {
    const alertDate = new Date(alert.published_date);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return alertDate > threeDaysAgo;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading recall alerts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>Enhanced Recall Research</span>
            <Badge variant="secondary">AI-Powered</Badge>
          </CardTitle>
          <CardDescription>
            Use Perplexity AI to enhance recall alerts with detailed sources, official documentation, 
            and comprehensive risk analysis. Click "Enhance with AI" on any recall below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{recallAlerts.length}</div>
              <div className="text-sm text-red-800">Total Recalls</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{highUrgencyRecalls.length}</div>
              <div className="text-sm text-orange-800">High Urgency</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{recentRecalls.length}</div>
              <div className="text-sm text-blue-800">Recent (3 days)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Recalls ({recallAlerts.length})</TabsTrigger>
          <TabsTrigger value="urgent">High Urgency ({highUrgencyRecalls.length})</TabsTrigger>
          <TabsTrigger value="recent">Recent ({recentRecalls.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedAlerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {recallAlerts.length > 0 ? (
            recallAlerts.map(alert => (
              <EnhancedRecallCard
                key={alert.id}
                alert={alert}
                onSaveAlert={handleSaveAlert}
                savedAlerts={savedAlerts}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No recall alerts found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          {highUrgencyRecalls.length > 0 ? (
            highUrgencyRecalls.map(alert => (
              <EnhancedRecallCard
                key={alert.id}
                alert={alert}
                onSaveAlert={handleSaveAlert}
                savedAlerts={savedAlerts}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No high urgency recalls at this time.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {recentRecalls.length > 0 ? (
            recentRecalls.map(alert => (
              <EnhancedRecallCard
                key={alert.id}
                alert={alert}
                onSaveAlert={handleSaveAlert}
                savedAlerts={savedAlerts}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No recent recalls in the last 3 days.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {savedAlerts.length > 0 ? (
            savedAlerts.map(alert => (
              <EnhancedRecallCard
                key={alert.id}
                alert={alert}
                onSaveAlert={handleSaveAlert}
                savedAlerts={savedAlerts}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No saved recall alerts yet.</p>
              <p className="text-sm mt-2">Save recalls to review them later.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedRecallDemo;
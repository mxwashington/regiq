import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, TestTube, BarChart3, Download } from 'lucide-react';

export const NavigationUpdater: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 shadow-lg z-50 w-64 border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-green-800">🚀 Phase 2 Complete!</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0 text-green-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-2">
          <Link to="/search">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <TestTube className="h-3 w-3 mr-2" />
              AI Search
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <BarChart3 className="h-3 w-3 mr-2" />
              Alerts Dashboard
            </Button>
          </Link>
          <Link to="/custom-alerts">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <Download className="h-3 w-3 mr-2" />
              Custom Alerts
            </Button>
          </Link>
        </div>
        <p className="text-xs text-green-600 mt-3">
          All Phase 2 features ready for testing!
        </p>
      </CardContent>
    </Card>
  );
};
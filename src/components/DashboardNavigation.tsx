import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  Search, 
  Bookmark, 
  Brain,
  ChevronRight
} from 'lucide-react';

interface DashboardNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  savedItemsCount?: number;
  thirdShiftStatus?: 'connected' | 'error' | 'loading';
}

export function DashboardNavigation({ 
  activeTab, 
  onTabChange, 
  savedItemsCount = 0,
  thirdShiftStatus = 'connected'
}: DashboardNavigationProps) {
  const tabs = [
    {
      id: 'alerts',
      label: 'Alerts',
      icon: AlertCircle,
      description: 'Regulatory feed and updates'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      description: 'Find specific alerts and regulations'
    },
    {
      id: 'saved',
      label: 'Saved Items',
      icon: Bookmark,
      description: 'Your bookmarked alerts',
      badge: savedItemsCount > 0 ? savedItemsCount : undefined
    },
    {
      id: 'thirdshift',
      label: 'ThirdShift AI',
      icon: Brain,
      description: 'AI-powered regulatory analysis',
      status: thirdShiftStatus
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'error': return 'text-red-500';
      case 'loading': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="border-b bg-background">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant={isActive ? 'default' : 'ghost'}
              className={`justify-start h-auto p-3 relative ${
                isActive ? 'shadow-sm' : 'hover:bg-muted'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className={`h-4 w-4 ${tab.status ? getStatusColor(tab.status) : ''}`} />
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tab.label}</span>
                    {tab.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                    {tab.status === 'loading' && (
                      <div className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {tab.description}
                  </span>
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
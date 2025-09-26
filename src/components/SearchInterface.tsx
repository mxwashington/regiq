import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Calendar, ExternalLink, Bookmark, Share2, Globe } from 'lucide-react';
import { searchForAlert, isValidSourceUrl } from '@/lib/alert-search';

import { logger } from '@/lib/logger';
interface SimpleAlert {
  id: string;
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
}

interface SearchInterfaceProps {
  alerts: SimpleAlert[];
  onSaveAlert: (alertId: string) => void;
  savedAlerts: any[];
}

export function SearchInterface({ alerts, onSaveAlert, savedAlerts }: SearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');

  const savedAlertIds = savedAlerts.map(item => item.id);

  // Filter alerts based on search criteria
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = !searchQuery || 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.source.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAgency = !selectedAgency || 
        alert.source.toLowerCase().includes(selectedAgency.toLowerCase());

      const matchesUrgency = !selectedUrgency || 
        alert.urgency.toLowerCase() === selectedUrgency.toLowerCase();

      return matchesSearch && matchesAgency && matchesUrgency;
    });
  }, [alerts, searchQuery, selectedAgency, selectedUrgency]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAgency('');
    setSelectedUrgency('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const shareAlert = async (alert: SimpleAlert) => {
    try {
      const shareData = {
        title: `Regulatory Alert: ${alert.title}`,
        text: alert.summary,
        url: alert.external_url || window.location.href
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const urlToCopy = alert.external_url || window.location.href;
        await navigator.clipboard.writeText(urlToCopy);
      }
    } catch (error) {
      logger.warn('Share failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Search Alerts</h2>
          <Badge variant="secondary">{filteredAlerts.length} results</Badge>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by title, content, or agency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <select 
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Agencies</option>
            <option value="fda">FDA</option>
            <option value="usda">USDA</option>
            <option value="epa">EPA</option>
            <option value="cdc">CDC</option>
          </select>

          <select 
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(searchQuery || selectedAgency || selectedUrgency) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No alerts found</p>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {alert.source}
                      </Badge>
                      <Badge 
                        variant={alert.urgency.toLowerCase() === 'high' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.urgency}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(alert.published_date)}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold leading-tight">
                      {alert.external_url ? (
                        <a 
                          href={alert.external_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors"
                        >
                          {alert.title}
                        </a>
                      ) : (
                        alert.title
                      )}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {alert.summary}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {alert.external_url && alert.external_url.trim() && alert.external_url.startsWith('http') ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <a 
                          href={alert.external_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          onClick={(e) => {
                            logger.info('Clicking external URL:', alert.external_url);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Read Full Alert
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => searchForAlert(alert.title, alert.source)}
                        className="flex items-center gap-2"
                      >
                        <Globe className="h-3 w-3" />
                        Search Web
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => searchForAlert(alert.title, alert.source)}
                      className="flex items-center gap-2"
                    >
                      <Search className="h-3 w-3" />
                      Find Source
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onSaveAlert(alert.id)}
                    className={savedAlertIds.includes(alert.id) ? 'text-blue-600' : ''}
                  >
                    <Bookmark className={`h-3 w-3 mr-1 ${savedAlertIds.includes(alert.id) ? 'fill-current' : ''}`} />
                    {savedAlertIds.includes(alert.id) ? 'Saved' : 'Save'}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => shareAlert(alert)}
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
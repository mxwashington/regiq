import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  FileText, 
  Search, 
  BarChart3, 
  Users,
  ExternalLink,
  Calendar,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { useDemoMode } from '@/contexts/DemoContext';

export const DemoContentDisplay: React.FC = () => {
  const { isDemoMode, demoContent, demoScenario } = useDemoMode();

  if (!isDemoMode) {
    return null;
  }

  const filteredContent = demoContent.filter(
    item => item.industry_focus === demoScenario || item.industry_focus === 'general'
  );

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'recall':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'alert':
        return <FileText className="h-5 w-5 text-orange-500" />;
      case 'search_result':
        return <Search className="h-5 w-5 text-blue-500" />;
      case 'analytics':
        return <BarChart3 className="h-5 w-5 text-green-500" />;
      case 'user_activity':
        return <Users className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getContentBadgeColor = (type: string) => {
    switch (type) {
      case 'recall':
        return 'destructive';
      case 'alert':
        return 'default';
      case 'search_result':
        return 'secondary';
      case 'analytics':
        return 'outline';
      case 'user_activity':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const renderRecallContent = (content: any) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="destructive" className="text-xs">
          {content.classification}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Recall #{content.recall_number}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <strong>Product:</strong> {content.product}
        </div>
        <div>
          <strong>Company:</strong> {content.company}
        </div>
        <div>
          <strong>Reason:</strong> {content.reason}
        </div>
        <div>
          <strong>Amount:</strong> {content.units_recalled}
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4" />
        <span>States affected: {content.states_affected?.join(', ')}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {content.date_initiated}
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium">Severity: {content.severity_score}/10</span>
        </div>
      </div>
    </div>
  );

  const renderAlertContent = (content: any) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="default" className="text-xs">
          {content.severity} Severity
        </Badge>
        <Badge variant="outline" className="text-xs">
          Alert #{content.alert_id}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <strong>Company:</strong> {content.company}
        </div>
        <div>
          <strong>Violation:</strong> {content.violation_type}
        </div>
        <div>
          <strong>Location:</strong> {content.facility_location}
        </div>
        <div>
          <strong>Response Due:</strong> {content.response_deadline}
        </div>
      </div>
      
      <div>
        <strong className="text-sm">Key Findings:</strong>
        <ul className="list-disc list-inside text-sm mt-1 space-y-1">
          {content.key_findings?.map((finding: string, index: number) => (
            <li key={index}>{finding}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderSearchContent = (content: any) => (
    <div className="space-y-3">
      <div className="bg-muted/50 p-3 rounded-md">
        <div className="text-sm font-medium">Query: "{content.query}"</div>
        <div className="text-xs text-muted-foreground mt-1">
          {content.total_results} results in {content.search_time}
        </div>
      </div>
      
      <div className="space-y-2">
        {content.results?.slice(0, 2).map((result: any, index: number) => (
          <div key={index} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{result.title}</h4>
              <Badge variant="secondary" className="text-xs">
                {(result.relevance_score * 100).toFixed(0)}% match
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {result.content?.slice(0, 120)}...
            </p>
            <div className="text-xs text-muted-foreground">
              Section: {result.section}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalyticsContent = (content: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center p-2 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{content.total_users}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{content.active_searches_today}</div>
          <div className="text-xs text-muted-foreground">Searches Today</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{content.alerts_sent_24h}</div>
          <div className="text-xs text-muted-foreground">Alerts Sent</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{content.system_uptime}</div>
          <div className="text-xs text-muted-foreground">Uptime</div>
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2">Top Search Terms</h4>
        <div className="flex flex-wrap gap-1">
          {content.top_search_terms?.map((term: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {term}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2">Subscription Breakdown</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>Free: {content.subscription_breakdown?.free}</div>
          <div>Pro: {content.subscription_breakdown?.professional}</div>
          <div>Enterprise: {content.subscription_breakdown?.enterprise}</div>
        </div>
      </div>
    </div>
  );

  const renderUserActivityContent = (content: any) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="text-center p-2 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{content.demo_sessions_today}</div>
          <div className="text-xs text-muted-foreground">Demo Sessions</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{content.average_session_duration}</div>
          <div className="text-xs text-muted-foreground">Avg Duration</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-md">
          <div className="text-lg font-bold">{content.conversion_rate}</div>
          <div className="text-xs text-muted-foreground">Conversion Rate</div>
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2">Features Demonstrated</h4>
        <div className="flex flex-wrap gap-1">
          {content.features_demonstrated?.map((feature: string, index: number) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span>User Feedback Score:</span>
        <Badge variant="outline" className="text-green-600">
          ⭐ {content.user_feedback_score}/5.0
        </Badge>
      </div>
    </div>
  );

  const renderContent = (item: any) => {
    switch (item.content_type) {
      case 'recall':
        return renderRecallContent(item.content);
      case 'alert':
        return renderAlertContent(item.content);
      case 'search_result':
        return renderSearchContent(item.content);
      case 'analytics':
        return renderAnalyticsContent(item.content);
      case 'user_activity':
        return renderUserActivityContent(item.content);
      default:
        return <div className="text-sm text-muted-foreground">Demo content</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            🎯 DEMO MODE ACTIVE
          </Badge>
          <span className="text-sm text-muted-foreground">
            Scenario: {demoScenario.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {filteredContent.map((item) => (
        <Card key={item.id} className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getContentIcon(item.content_type)}
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getContentBadgeColor(item.content_type) as any} className="text-xs">
                  {item.content_type.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  DEMO
                </Badge>
              </div>
            </div>
            {item.demo_scenario && (
              <CardDescription className="text-xs">
                Demo Scenario: {item.demo_scenario.replace('_', ' ')}
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent>
            {renderContent(item)}
          </CardContent>
        </Card>
      ))}
      
      {filteredContent.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="text-muted-foreground">No demo content available for this scenario</div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Configure Demo Content
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Trash2, Search, Filter, Database, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logger } from '@/lib/logger';

export const AdminAlertManager = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [clearType, setClearType] = useState<'all' | 'source' | 'date'>('all');
  const [selectedSource, setSelectedSource] = useState('');
  const [daysCutoff, setDaysCutoff] = useState('7');
  const { toast } = useToast();

  const handleClearAlerts = async () => {
    setIsClearing(true);
    try {
      let query = supabase.from('alerts').delete();

      if (clearType === 'source' && selectedSource) {
        query = query.ilike('source', `%${selectedSource}%`);
      } else if (clearType === 'date') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysCutoff));
        query = query.lt('published_date', cutoffDate.toISOString());
      }

      const { error, count } = await query;

      if (error) {
        logger.error('Error clearing alerts', error, 'AdminAlertManager');
        toast({
          title: "Error",
          description: "Failed to clear alerts. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Successfully cleared alerts. ${count || 'Unknown'} alerts removed.`,
        });
      }
    } catch (error) {
      logger.error('Error clearing alerts', error, 'AdminAlertManager');
      toast({
        title: "Error",
        description: "Failed to clear alerts. Please try again.",
        variant: "destructive",
      });
    }
    setIsClearing(false);
  };

  const triggerDataCollection = async () => {
    try {
      // Trigger all data collection functions
      const functions = [
        'regulatory-data-pipeline',
        'rss-alert-scraper', 
        'regulatory-feeds-scraper'
      ];

      for (const functionName of functions) {
        await supabase.functions.invoke(functionName, {
          body: { manual_trigger: true }
        });
      }

      toast({
        title: "Success",
        description: "Data collection triggered for all sources. New alerts should appear within 1-2 minutes.",
      });
    } catch (error) {
      logger.error('Error triggering data collection', error, 'AdminAlertManager');
      toast({
        title: "Error",
        description: "Failed to trigger data collection. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Alert Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={triggerDataCollection}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data Sources
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-medium">Clear Alerts</h3>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Clear Type:</Label>
              <Select value={clearType} onValueChange={(value: 'all' | 'source' | 'date') => setClearType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Clear All Alerts</SelectItem>
                  <SelectItem value="source">Clear by Source</SelectItem>
                  <SelectItem value="date">Clear Older Than</SelectItem>
                </SelectContent>
              </Select>

              {clearType === 'source' && (
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-sm">Source Agency:</Label>
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fda">FDA</SelectItem>
                      <SelectItem value="usda">USDA</SelectItem>
                      <SelectItem value="epa">EPA</SelectItem>
                      <SelectItem value="cdc">CDC</SelectItem>
                      <SelectItem value="osha">OSHA</SelectItem>
                      <SelectItem value="ftc">FTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {clearType === 'date' && (
                <div className="space-y-2">
                  <Label htmlFor="days" className="text-sm">Clear alerts older than:</Label>
                  <Select value={daysCutoff} onValueChange={setDaysCutoff}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isClearing || (clearType === 'source' && !selectedSource)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isClearing ? 'Clearing...' : 'Clear Alerts'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Alert Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                      {clearType === 'all' && "This will permanently delete ALL alerts from the database."}
                      {clearType === 'source' && `This will permanently delete all alerts from ${selectedSource?.toUpperCase()}.`}
                      {clearType === 'date' && `This will permanently delete all alerts older than ${daysCutoff} days.`}
                      <br />
                      <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAlerts}>
                      Confirm Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
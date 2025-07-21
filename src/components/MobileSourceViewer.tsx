import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Copy, Share2, Globe, Calendar, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MobileSourceViewerProps {
  alert: {
    id: string;
    title: string;
    summary: string;
    source: string;
    published_date: string;
    external_url?: string;
    urgency: string;
  };
  trigger?: React.ReactNode;
}

export function MobileSourceViewer({ alert, trigger }: MobileSourceViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewSource = async () => {
    if (alert.external_url) {
      // Add haptic feedback for native apps
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }

      // Decode HTML entities in the URL
      const decodedUrl = alert.external_url
        ?.replace(/&amp;/g, '&')
        ?.replace(/&lt;/g, '<')
        ?.replace(/&gt;/g, '>')
        ?.replace(/&quot;/g, '"')
        ?.replace(/&#39;/g, "'");
      
      if (decodedUrl) {
        if (Capacitor.isNativePlatform()) {
          // Use native browser for better mobile experience
          await Browser.open({ 
            url: decodedUrl,
            windowName: '_blank',
            toolbarColor: '#2563eb',
            presentationStyle: 'popover'
          });
        } else {
          window.open(decodedUrl, '_blank', 'noopener,noreferrer');
        }
        setIsOpen(false);
      }
    }
  };

  const handleCopyUrl = async () => {
    if (alert.external_url) {
      try {
        // Add haptic feedback for native apps
        if (Capacitor.isNativePlatform()) {
          await Haptics.impact({ style: ImpactStyle.Light });
          await Clipboard.write({
            string: alert.external_url
          });
        } else {
          await navigator.clipboard.writeText(alert.external_url);
        }
        
        toast({
          title: "URL copied",
          description: "Source URL has been copied to your clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Unable to copy the URL.",
          variant: "destructive"
        });
      }
    }
  };

  const handleShare = async () => {
    const shareText = `${alert.title}\n\nSource: ${alert.source}`;
    const shareUrl = alert.external_url || window.location.href;
    
    try {
      // Add haptic feedback for native apps
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
        
        await Share.share({
          title: alert.title,
          text: shareText,
          url: shareUrl,
          dialogTitle: 'Share Alert'
        });
      } else if (navigator.share) {
        await navigator.share({
          title: alert.title,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Copied to clipboard",
          description: "Alert details have been copied to your clipboard.",
        });
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Unable to share this alert.",
        variant: "destructive"
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            <span>View Details</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left leading-tight pr-6">
            {alert.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Alert Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${getUrgencyColor(alert.urgency)} text-xs px-2 py-1`}
              >
                {alert.urgency.toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <span className="font-medium">{alert.source}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(alert.published_date)}</span>
              </div>
            </div>
            
            {alert.summary && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm leading-relaxed">{alert.summary}</p>
              </div>
            )}
          </div>

          {/* Source URL Info */}
          {alert.external_url && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Official Source</span>
              </div>
              
              <div className="text-xs text-muted-foreground break-all">
                {alert.external_url}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleViewSource}
                  className="w-full justify-start gap-2"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Source Link
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCopyUrl}
                    className="flex-1 justify-start gap-2"
                    size="sm"
                  >
                    <Copy className="h-4 w-4" />
                    Copy URL
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleShare}
                    className="flex-1 justify-start gap-2"
                    size="sm"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!alert.external_url && (
            <div className="text-center py-4 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No source URL available for this alert</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
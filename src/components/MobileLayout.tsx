import React, { ReactNode } from 'react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { MobileNavigation } from '@/components/MobileNavigation';
import { UpdateNotification } from '@/components/UpdateNotification';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showNavigation = true,
  className
}) => {
  const { 
    isMobile, 
    isTablet, 
    orientation, 
    isOnline,
    usePullToRefresh 
  } = useMobileOptimization({
    enablePullToRefresh: true,
    enableTouchFeedback: true,
    enableMobileDebug: false
  });

  // Handle pull-to-refresh
  usePullToRefresh(() => {
    window.location.reload();
  });

  return (
    <div className={cn(
      'min-h-screen bg-background',
      isMobile && 'mobile-optimized',
      className
    )}>
      {/* Update notification */}
      <UpdateNotification />
      
      {/* Mobile header with navigation */}
      {showNavigation && (
        <header className={cn(
          'sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50',
          isMobile ? 'h-14 px-4' : 'h-16 px-6'
        )}>
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png" 
                alt="RegIQ Logo" 
                className={cn(
                  'rounded-md',
                  isMobile ? 'h-8 w-8' : 'h-10 w-10'
                )}
              />
              <h1 className={cn(
                'font-bold text-primary',
                isMobile ? 'text-lg' : 'text-xl'
              )}>
                RegIQ
              </h1>
            </div>

            {/* Connection status indicator */}
            {!isOnline && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className={cn(isMobile && 'hidden sm:inline')}>
                  Offline
                </span>
              </div>
            )}

            {/* Mobile navigation */}
            {isMobile && <MobileNavigation />}
          </div>
        </header>
      )}

      {/* Main content area */}
      <main className={cn(
        'flex-1',
        isMobile ? 'mobile-container' : 'container mx-auto px-6 py-4',
        isTablet && 'max-w-4xl',
        orientation === 'landscape' && isMobile && 'mobile-landscape-compact'
      )}>
        {children}
      </main>

      {/* Mobile-specific indicators */}
      {isMobile && (
        <>
          {/* Pull-to-refresh indicator */}
          <div id="pull-to-refresh-indicator" className="pull-to-refresh">
            <div className="flex items-center justify-center gap-2">
              <div className="mobile-loading-spinner" />
              <span>Refreshing...</span>
            </div>
          </div>

          {/* Network status toast area */}
          <div 
            id="mobile-toast-area" 
            className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none"
          />
        </>
      )}
    </div>
  );
};
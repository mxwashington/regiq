import { useEffect, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PullToRefreshConfig {
  threshold?: number;
  maxPullDistance?: number;
  resistance?: number;
  enabled?: boolean;
}

export const useMobilePullToRefresh = (
  onRefresh: () => Promise<void> | void,
  config: PullToRefreshConfig = {}
) => {
  const {
    threshold = 100,
    maxPullDistance = 150,
    resistance = 0.5,
    enabled = true
  } = config;

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Show feedback
      toast({
        title: 'Refreshing...',
        description: 'Fetching latest regulatory alerts',
        duration: 2000
      });

      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Please try again',
        variant: 'destructive',
        duration: 3000
      });
    } finally {
      setIsRefreshing(false);
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [onRefresh, isRefreshing, toast]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let startY = 0;
    let currentY = 0;
    let touching = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY > 0) return;
      
      startY = e.touches[0].clientY;
      touching = true;
      setIsPulling(false);
      setPullDistance(0);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touching || window.scrollY > 0) return;

      currentY = e.touches[0].clientY;
      const rawDistance = currentY - startY;

      // Only pull down
      if (rawDistance <= 0) return;

      // Apply resistance
      const distance = Math.min(
        rawDistance * resistance,
        maxPullDistance
      );

      setPullDistance(distance);

      if (distance > threshold) {
        setIsPulling(true);
      } else {
        setIsPulling(false);
      }

      // Update visual indicator
      const indicator = document.getElementById('pull-to-refresh-indicator');
      if (indicator) {
        if (distance > 0) {
          indicator.style.transform = `translateY(${Math.min(distance - 100, 0)}px)`;
          indicator.classList.add('visible');
        } else {
          indicator.classList.remove('visible');
        }
      }

      // Prevent default scroll behavior when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!touching) return;

      touching = false;

      // Hide indicator
      const indicator = document.getElementById('pull-to-refresh-indicator');
      if (indicator) {
        indicator.style.transform = 'translateY(-100%)';
        indicator.classList.remove('visible');
      }

      // Trigger refresh if threshold met
      if (isPulling && pullDistance > threshold) {
        handleRefresh();
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    // Add event listeners with passive option for better performance
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, threshold, maxPullDistance, resistance, isPulling, pullDistance, handleRefresh]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    canRefresh: pullDistance > threshold
  };
};
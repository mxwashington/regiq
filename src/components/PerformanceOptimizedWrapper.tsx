/**
 * Performance Optimized Wrapper - Replaces problematic webhook system
 * Provides the core performance and state management improvements
 */

import React from 'react';
import { usePerformanceMonitor } from '@/hooks/useStateManager';

interface PerformanceOptimizedWrapperProps {
  children: React.ReactNode;
  name: string;
  level?: 'page' | 'component' | 'critical';
}

export const PerformanceOptimizedWrapper: React.FC<PerformanceOptimizedWrapperProps> = ({
  children,
  name,
  level = 'component'
}) => {
  const { measureRender } = usePerformanceMonitor();

  React.useEffect(() => {
    measureRender(name, () => {
      // Component rendered
    });
  }, [name, measureRender]);

  return (
    <ErrorBoundaryEnhanced level={level} enablePerformanceMonitoring>
      {children}
    </ErrorBoundaryEnhanced>
  );
};

// Usage examples for other components:
export const PageWrapper: React.FC<{ children: React.ReactNode; name: string }> = ({ children, name }) => (
  <PerformanceOptimizedWrapper level="page" name={name}>
    {children}
  </PerformanceOptimizedWrapper>
);

export const ComponentWrapper: React.FC<{ children: React.ReactNode; name: string }> = ({ children, name }) => (
  <PerformanceOptimizedWrapper level="component" name={name}>
    {children}
  </PerformanceOptimizedWrapper>
);
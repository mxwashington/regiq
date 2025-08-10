
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  asChild?: boolean;
}

export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(({
  className,
  variant = 'ghost',
  size = 'sm',
  children,
  onClick,
  ...props
}, ref) => {
  const isMobile = useIsMobile();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event bubbling and ensure clean click handling
    e.stopPropagation();
    e.preventDefault();
    
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        // Base mobile optimizations
        'touch-manipulation select-none',
        // Ensure minimum touch target size (44px recommended)
        isMobile && 'min-h-[44px] min-w-[44px] px-3',
        // Better spacing for mobile
        isMobile && 'text-sm',
        // Prevent text selection and improve touch feedback
        'user-select-none -webkit-touch-callout-none',
        // Active state for better touch feedback
        'active:scale-95 transition-transform duration-75',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
});

MobileButton.displayName = 'MobileButton';

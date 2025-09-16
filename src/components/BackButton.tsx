import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallback?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  fallback = '/', 
  variant = 'ghost',
  size = 'default',
  className = '',
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleBack = () => {
    // Check if we can go back in browser history
    if (window.history.length > 1 && document.referrer.includes(window.location.origin)) {
      navigate(-1);
    } else {
      // Fallback to safe route
      navigate(fallback);
    }
  };

  // Don't show back button on home page unless explicitly set
  if (location.pathname === '/' && fallback === '/') {
    return null;
  }
  
  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleBack} 
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label="Go back to previous page"
    >
      <ArrowLeft className="h-4 w-4" />
      {children || 'Back'}
    </Button>
  );
};

export default BackButton;
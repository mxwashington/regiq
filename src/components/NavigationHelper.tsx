/**
 * NavigationHelper - Centralized navigation logic for RegIQ
 * Ensures all internal navigation uses the router and maintains custom domain
 */

import { useNavigate } from 'react-router-dom';
import { navigateToPath, openExternalUrl, isInternalUrl } from '@/lib/domain';

export function useNavigationHelper() {
  const navigate = useNavigate();

  const navigateTo = (path: string) => {
    navigateToPath(navigate, path);
  };

  const handleLinkClick = (url: string, external?: boolean) => {
    if (external || !isInternalUrl(url)) {
      openExternalUrl(url);
    } else {
      // Extract path from URL if it's a full URL to our domain
      try {
        const urlObj = new URL(url);
        navigateTo(urlObj.pathname + urlObj.search + urlObj.hash);
      } catch {
        // Not a full URL, treat as relative path
        navigateTo(url);
      }
    }
  };

  return {
    navigateTo,
    handleLinkClick,
    openExternal: openExternalUrl,
  };
}

/**
 * Smart Link component that handles internal vs external navigation correctly
 */
interface SmartLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
  onClick?: () => void;
}

export function SmartLink({ href, children, className, external, onClick }: SmartLinkProps) {
  const { handleLinkClick } = useNavigationHelper();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
    handleLinkClick(href, external);
  };

  return (
    <a 
      href={href} 
      className={className} 
      onClick={handleClick}
      {...(external || !isInternalUrl(href) ? {
        target: '_blank',
        rel: 'noopener noreferrer'
      } : {})}
    >
      {children}
    </a>
  );
}
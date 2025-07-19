/**
 * Domain utility functions for RegIQ custom domain management
 * Ensures all URLs use the correct custom domain consistently
 */

// Custom domain configuration
const CUSTOM_DOMAIN = 'regiq.org';
const CUSTOM_PROTOCOL = 'https';

/**
 * Get the current domain - uses custom domain if available, fallback to current origin
 */
export function getCurrentDomain(): string {
  // Check if we're on the custom domain already
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    
    // If already on custom domain, use it
    if (currentHost === CUSTOM_DOMAIN) {
      return `${CUSTOM_PROTOCOL}://${CUSTOM_DOMAIN}`;
    }
    
    // Check if we're in production by looking at the hostname
    const isProduction = !currentHost.includes('localhost') && 
                        !currentHost.includes('127.0.0.1') && 
                        !currentHost.includes('dev');
    
    // Use custom domain for production, current origin for development
    if (isProduction) {
      return `${CUSTOM_PROTOCOL}://${CUSTOM_DOMAIN}`;
    }
    
    return window.location.origin;
  }
  
  // Fallback for SSR or when window is not available
  return `${CUSTOM_PROTOCOL}://${CUSTOM_DOMAIN}`;
}

/**
 * Build absolute URL with the correct domain
 */
export function buildAbsoluteUrl(path: string): string {
  const domain = getCurrentDomain();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${cleanPath}`;
}

/**
 * Build auth redirect URL for Supabase
 */
export function buildAuthRedirectUrl(path: string = '/dashboard'): string {
  return buildAbsoluteUrl(path);
}

/**
 * Build magic link redirect URL
 */
export function buildMagicLinkRedirectUrl(): string {
  return buildAbsoluteUrl('/auth?type=magiclink');
}

/**
 * Build password reset redirect URL
 */
export function buildPasswordResetRedirectUrl(): string {
  return buildAbsoluteUrl('/auth?type=recovery');
}

/**
 * Check if URL is internal to our domain
 */
export function isInternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const currentDomain = getCurrentDomain();
    const currentUrlObj = new URL(currentDomain);
    
    return urlObj.hostname === currentUrlObj.hostname;
  } catch {
    // If URL parsing fails, assume it's a relative URL (internal)
    return !url.startsWith('http');
  }
}

/**
 * Get canonical URL for SEO purposes
 */
export function getCanonicalUrl(path: string = ''): string {
  return buildAbsoluteUrl(path);
}

/**
 * Open external URL safely
 */
export function openExternalUrl(url: string): void {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Navigate to internal path using the router
 */
export function navigateToPath(navigate: (path: string) => void, path: string): void {
  // For internal navigation, always use relative paths to maintain domain
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  navigate(cleanPath);
}

/**
 * Debug function to log current domain configuration
 */
export function logDomainInfo(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Domain Configuration:', {
      customDomain: CUSTOM_DOMAIN,
      currentOrigin: window.location.origin,
      currentDomain: getCurrentDomain(),
      hostname: window.location.hostname,
    });
  }
}
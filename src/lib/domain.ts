
// Enhanced domain configuration with detailed logging
const getBaseUrl = (): string => {
  // Check if we're in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const devUrl = `${window.location.protocol}//${window.location.host}`;
    console.log('Development environment detected, using:', devUrl);
    return devUrl;
  }
  
  // Production URL
  const prodUrl = 'https://regiq.org';
  console.log('Production environment, using:', prodUrl);
  return prodUrl;
};

export const buildMagicLinkRedirectUrl = (): string => {
  const baseUrl = getBaseUrl();
  const redirectPath = '/auth/callback';
  const fullUrl = `${baseUrl}${redirectPath}`;
  
  console.log('Building magic link redirect URL:', {
    baseUrl,
    redirectPath,
    fullUrl,
    currentLocation: typeof window !== 'undefined' ? window.location.href : 'SSR'
  });
  
  return fullUrl;
};

// Enhanced domain validation with logging
export const isValidDomain = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const validDomains = ['regiq.org', 'localhost'];
    const isValid = validDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    console.log('Domain validation:', {
      url,
      hostname: urlObj.hostname,
      isValid,
      validDomains
    });
    
    return isValid;
  } catch (error) {
    console.error('Invalid URL format:', url, error);
    return false;
  }
};

export const getDomainForEnvironment = (): string => {
  const domain = getBaseUrl();
  console.log('Current domain for environment:', domain);
  return domain;
};

// Navigation utilities
export const navigateToPath = (navigate: (path: string) => void, path: string): void => {
  console.log('Navigating to path:', path);
  navigate(path);
};

export const openExternalUrl = (url: string): void => {
  console.log('Opening external URL:', url);
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const isInternalUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url, window.location.origin);
    const currentDomain = window.location.hostname;
    const isInternal = urlObj.hostname === currentDomain || urlObj.hostname === 'regiq.org';
    console.log('Internal URL check:', { url, isInternal });
    return isInternal;
  } catch {
    // Relative URLs are considered internal
    const isRelative = !url.startsWith('http');
    console.log('URL check (relative):', { url, isRelative });
    return isRelative;
  }
};

// Redirect logic for main.tsx
export const getRedirectUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Only redirect on specific production domains to regiq.org
  const currentDomain = window.location.hostname;
  const targetDomain = 'regiq.org';
  
  // Don't redirect if already on target domain or localhost
  if (currentDomain === targetDomain || currentDomain === 'localhost') {
    return null;
  }
  
  // Redirect to regiq.org maintaining the current path
  const targetUrl = `https://${targetDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
  console.log('Redirect URL:', { from: window.location.href, to: targetUrl });
  return targetUrl;
};

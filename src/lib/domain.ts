
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

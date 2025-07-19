export const getRedirectUrl = (): string => {
  // For production, use the actual domain
  if (window.location.hostname === 'regiq.org') {
    return 'https://regiq.org/auth/callback';
  }
  
  // For development, use localhost
  if (window.location.hostname === 'localhost') {
    return `${window.location.origin}/auth/callback`;
  }
  
  // Fallback to current origin
  return `${window.location.origin}/auth/callback`;
};

export const getBaseUrl = (): string => {
  return window.location.origin;
};
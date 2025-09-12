import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface SecurityHeadersProps {
  nonce?: string;
}

const SecurityHeaders: React.FC<SecurityHeadersProps> = ({ nonce }) => {
  useEffect(() => {
    // Set security-related meta tags and headers via JavaScript
    // Note: Most security headers should be set at the server/CDN level
    // This is supplementary for client-side enforcement
    
    // Prevent clickjacking
    if (window.top !== window.self) {
      document.body.style.display = 'none';
    }
    
    // Basic XSS protection
    const metaXSSProtection = document.createElement('meta');
    metaXSSProtection.httpEquiv = 'X-XSS-Protection';
    metaXSSProtection.content = '1; mode=block';
    document.head.appendChild(metaXSSProtection);
    
    // Content type options
    const metaContentType = document.createElement('meta');
    metaContentType.httpEquiv = 'X-Content-Type-Options';
    metaContentType.content = 'nosniff';
    document.head.appendChild(metaContentType);
    
    // Referrer policy
    const metaReferrer = document.createElement('meta');
    metaReferrer.name = 'referrer';
    metaReferrer.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(metaReferrer);
    
    return () => {
      // Cleanup on unmount
      document.head.removeChild(metaXSSProtection);
      document.head.removeChild(metaContentType);
      document.head.removeChild(metaReferrer);
    };
  }, []);

  // Content Security Policy - Fixed frame-ancestors
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' data: https: blob:",
    "connect-src 'self' https://piyikxxgoekawboitrzz.supabase.co https://api.stripe.com wss://piyikxxgoekawboitrzz.supabase.co",
    "frame-src 'self' https://js.stripe.com",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  return (
    <Helmet>
      {/* Content Security Policy */}
      <meta httpEquiv="Content-Security-Policy" content={cspPolicy} />
      
      {/* Permissions Policy */}
      <meta 
        httpEquiv="Permissions-Policy" 
        content="camera=(), microphone=(), geolocation=(), payment=('self'), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" 
      />
      
      {/* Additional Security Headers */}
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-DNS-Prefetch-Control" content="off" />
      <meta httpEquiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains; preload" />
    </Helmet>
  );
};

export default SecurityHeaders;
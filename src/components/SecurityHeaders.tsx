import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

const SecurityHeaders: React.FC = () => {
  useEffect(() => {
    // Client-side security header enforcement
    const applySecurityHeaders = () => {
      // Prevent clickjacking by hiding body if in iframe
      if (window.self !== window.top) {
        document.body.style.display = 'none';
        console.warn('RegIQ: Clickjacking attempt detected');
        
        // Log security event if available
        if (window.logSecurityEvent) {
          window.logSecurityEvent('clickjacking_attempt', {
            referrer: document.referrer,
            userAgent: navigator.userAgent
          });
        }
      }

      // Monitor for suspicious activities
      const handleUnload = () => {
        if (window.logSecurityEvent) {
          window.logSecurityEvent('page_unload', {
            path: window.location.pathname,
            sessionDuration: Date.now() - (window.sessionStart || Date.now())
          });
        }
      };

      const handleVisibilityChange = () => {
        if (document.hidden && window.logSecurityEvent) {
          window.logSecurityEvent('tab_hidden', {
            path: window.location.pathname
          });
        }
      };

      // Store session start time
      if (!window.sessionStart) {
        window.sessionStart = Date.now();
      }

      // Add event listeners
      window.addEventListener('beforeunload', handleUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Create and append security meta tags
      const metaTags = [
        { name: 'X-Content-Type-Options', content: 'nosniff' },
        { name: 'X-Frame-Options', content: 'DENY' },
        { name: 'X-XSS-Protection', content: '1; mode=block' },
        { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
        { name: 'Permissions-Policy', content: 'camera=(), microphone=(), geolocation=(), payment=()' }
      ];

      metaTags.forEach(({ name, content }) => {
        const existingMeta = document.querySelector(`meta[name="${name}"]`);
        if (!existingMeta) {
          const meta = document.createElement('meta');
          meta.name = name;
          meta.content = content;
          document.head.appendChild(meta);
        }
      });

      // Cleanup function
      return () => {
        window.removeEventListener('beforeunload', handleUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    const cleanup = applySecurityHeaders();

    // Cleanup function to remove added meta tags and event listeners
    return () => {
      const securityMetaTags = document.querySelectorAll('meta[name^="X-"], meta[name="Referrer-Policy"], meta[name="Permissions-Policy"]');
      securityMetaTags.forEach(tag => tag.remove());
      cleanup?.();
    };
  }, []);

  // Enhanced CSP policy - more restrictive for better security
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com wss://*.supabase.co",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",  // Changed from 'none' to 'self' for better compatibility
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; ');

  return (
    <Helmet>
      <meta httpEquiv="Content-Security-Policy" content={cspPolicy} />
      <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=()" />
      <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
      <meta httpEquiv="X-DNS-Prefetch-Control" content="off" />
      <meta httpEquiv="Strict-Transport-Security" content="max-age=63072000; includeSubDomains; preload" />
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta name="referrer" content="strict-origin-when-cross-origin" />
    </Helmet>
  );
};

// Extend window interface for TypeScript
declare global {
  interface Window {
    logSecurityEvent?: (eventType: string, metadata?: Record<string, any>) => void;
    sessionStart?: number;
  }
}

export default SecurityHeaders;
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export const EnhancedSecurityHeaders = () => {
  // Generate nonce for CSP
  const nonce = crypto.randomUUID();

  useEffect(() => {
    // Set nonce in window for use by scripts
    (window as any).__CSP_NONCE__ = nonce;
  }, [nonce]);

  // Enhanced Content Security Policy with nonce
  const cspPolicy = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://js.stripe.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://piyikxxgoekawboitrzz.supabase.co wss://piyikxxgoekawboitrzz.supabase.co https://api.stripe.com;
    frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    report-uri /api/csp-report;
  `.replace(/\s+/g, ' ').trim();

  return (
    <Helmet>
      {/* Enhanced Security Headers */}
      <meta httpEquiv="Content-Security-Policy" content={cspPolicy} />
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      <meta httpEquiv="Permissions-Policy" 
            content="camera=(), microphone=(), geolocation=(), payment=(), usb=()" />
      <meta httpEquiv="Strict-Transport-Security" 
            content="max-age=31536000; includeSubDomains; preload" />
      
      {/* Security-focused meta tags */}
      <meta name="robots" content="index, follow" />
      <meta httpEquiv="X-DNS-Prefetch-Control" content="off" />
      
      {/* Feature Policy for enhanced security */}
      <meta httpEquiv="Feature-Policy" 
            content="vibrate 'none'; payment 'none'; sync-xhr 'none';" />
    </Helmet>
  );
};
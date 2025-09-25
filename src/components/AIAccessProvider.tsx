import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getAIFriendlyMetaTags, isAIOrBot } from '@/lib/ai-access-helper';
import { logger } from '@/lib/logger';

interface AIAccessProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that makes the site more accessible to AI systems and crawlers
 */
export const AIAccessProvider: React.FC<AIAccessProviderProps> = ({ children }) => {
  const isBot = isAIOrBot();
  const metaTags = getAIFriendlyMetaTags();

  useEffect(() => {
    // Mark that React has loaded for crawler detection
    document.documentElement.setAttribute('data-react-loaded', 'true');
    
    if (isBot) {
      logger.info('AI/Bot detected - optimizing for accessibility', undefined, 'AIAccessProvider');
      
      // Add structured data for better AI understanding
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "RegIQ",
        "description": "Real-time regulatory alerts and intelligence platform for food, agriculture, and pharmaceutical industries",
        "applicationCategory": "Business Application",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "category": "SaaS Platform"
        },
        "audience": {
          "@type": "Audience",
          "audienceType": "QA Teams, Regulatory Professionals"
        },
        "keywords": "regulatory alerts, FDA, USDA, EPA, food safety, pharmaceutical compliance, agricultural regulations"
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [isBot]);

  return (
    <>
      <Helmet>
        {metaTags.map((tag, index) => {
          if (tag.property) {
            return <meta key={index} property={tag.property} content={tag.content} />;
          }
          return <meta key={index} name={tag.name} content={tag.content} />;
        })}
        
        {/* Additional AI-friendly meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3B82F6" />
        <link rel="canonical" href={window.location.href} />
        
        {/* Open Graph for social/AI preview */}
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="RegIQ" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="RegIQ - Regulatory Intelligence Platform" />
        <meta name="twitter:description" content="Real-time regulatory alerts for food, ag, and pharma industries" />
      </Helmet>
      {children}
    </>
  );
};
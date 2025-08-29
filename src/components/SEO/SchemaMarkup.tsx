import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SchemaMarkupProps {
  type: 'organization' | 'webApplication' | 'article' | 'faq';
  data?: any;
}

export const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ type, data = {} }) => {
  const getSchemaData = () => {
    switch (type) {
      case 'organization':
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "RegIQ",
          "url": "https://regiq.org",
          "logo": "https://regiq.org/logo.png",
          "description": "AI-powered food safety compliance platform for FDA & USDA regulatory monitoring",
          "foundingDate": "2024",
          "industry": "Food Safety Technology",
          "location": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressRegion": "Oklahoma",
              "addressCountry": "US"
            }
          },
          "sameAs": [
            "https://linkedin.com/company/regiq",
            "https://twitter.com/regiq"
          ],
          ...data
        };

      case 'webApplication':
        return {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "RegIQ Platform",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "url": "https://regiq.org",
          "description": "Real-time FDA & USDA regulatory monitoring and compliance software for food manufacturers",
          "offers": {
            "@type": "Offer",
            "price": "Contact for pricing",
            "priceCurrency": "USD"
          },
          "featureList": [
            "Real-time FDA food safety alerts",
            "USDA FSIS compliance monitoring",
            "HACCP automation",
            "Recall tracking and management",
            "Inspection readiness tools",
            "Supplier verification",
            "Allergen management"
          ],
          "provider": {
            "@type": "Organization",
            "name": "RegIQ"
          },
          ...data
        };

      case 'article':
        return {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": data.title || "Food Safety Compliance Guide",
          "description": data.description || "Comprehensive guide to food safety compliance",
          "author": {
            "@type": "Organization",
            "name": "RegIQ"
          },
          "publisher": {
            "@type": "Organization",
            "name": "RegIQ",
            "logo": {
              "@type": "ImageObject",
              "url": "https://regiq.org/logo.png"
            }
          },
          "datePublished": data.datePublished || new Date().toISOString(),
          "dateModified": data.dateModified || new Date().toISOString(),
          ...data
        };

      case 'faq':
        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": data.questions || []
        };

      default:
        return {};
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(getSchemaData())}
      </script>
    </Helmet>
  );
};
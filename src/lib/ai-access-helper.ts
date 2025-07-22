/**
 * Helper functions to detect and allow AI crawlers/systems
 */

// Common AI user agents and bot patterns
const AI_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper',
  'GPTBot', 'Google-Extended', 'ChatGPT-User',
  'Claude-Web', 'anthropic', 'openai',
  'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'ia_archiver', 'archive.org_bot',
  'BingPreview', 'Yahoo! Slurp', 'DuckDuckBot',
  'PerplexityBot', 'YouBot', 'Applebot'
];

// Known AI/datacenter IP ranges (simplified - you'd want a more comprehensive list)
const AI_IP_RANGES = [
  // OpenAI
  '20.15.240.64/26', '20.15.240.128/25', '20.15.241.0/24',
  // Anthropic (Claude)
  '3.101.158.0/23', '3.101.177.48/28',
  // Common datacenter ranges that AI services use
  '52.', '34.', '35.', // Google Cloud
  '20.', '40.', '52.', // Azure
  '3.', '18.', '52.', // AWS
];

/**
 * Detects if the current request is from an AI system or bot
 */
export const isAIOrBot = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return AI_USER_AGENTS.some(agent => userAgent.includes(agent.toLowerCase()));
};

/**
 * Checks if an IP address is likely from an AI service
 */
export const isAIIP = (ip: string): boolean => {
  if (!ip) return false;
  
  return AI_IP_RANGES.some(range => {
    if (range.endsWith('.')) {
      return ip.startsWith(range);
    }
    // For CIDR ranges, you'd want a proper CIDR check library
    return ip.startsWith(range.split('/')[0].slice(0, -1));
  });
};

/**
 * Creates a bot-friendly configuration
 */
export const getBotConfig = () => ({
  skipIPTracking: true,
  skipAnalytics: true,
  allowAnonymousAccess: true,
  reducedFunctionality: true
});

/**
 * Determines if we should skip IP tracking for this user
 */
export const shouldSkipIPTracking = (): boolean => {
  return isAIOrBot() || 
         window.location.search.includes('bot=true') ||
         window.location.search.includes('ai=true');
};

/**
 * Creates a robots.txt friendly meta tags
 */
export const getAIFriendlyMetaTags = () => [
  { name: 'robots', content: 'index, follow' },
  { name: 'googlebot', content: 'index, follow' },
  { property: 'og:title', content: 'RegIQ - Regulatory Intelligence Platform' },
  { property: 'og:description', content: 'Real-time regulatory alerts and intelligence for food, agriculture, and pharmaceutical industries' },
  { property: 'og:type', content: 'website' },
  { name: 'description', content: 'RegIQ aggregates real-time regulatory alerts from FDA, USDA, EPA and other agencies for QA teams in food, ag, and pharma industries.' }
];
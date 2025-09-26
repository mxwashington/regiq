import { logger } from '@/lib/logger';

// Direct test of FDA Data Dashboard API
const testFDAAPI = async () => {
  const ddapiKey = 'YOUR_FDA_DDAPI_KEY'; // We'll use the secret in the edge function
  
  logger.info('Testing FDA Data Dashboard API endpoints...');
  
  // Test both endpoints
  const endpoints = [
    {
      name: 'Warning Letters',
      url: 'https://datadashboard.fda.gov/ora/api/complianceactions.json?limit=5'
    },
    {
      name: '483s',
      url: 'https://datadashboard.fda.gov/ora/api/inspectionscitations.json?limit=5'
    }
  ];
  
  for (const endpoint of endpoints) {
    logger.info(`\nTesting ${endpoint.name}...`);
    logger.info(`URL: ${endpoint.url}`);
  }
  
  return 'Test configuration ready';
};

testFDAAPI();
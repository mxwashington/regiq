import { logger } from '@/lib/logger';

// Simple test to check FDA API without authentication
async function checkFDAAPI() {
  logger.info('🔍 Checking FDA Data Dashboard API availability...');
  
  try {
    // Test basic connectivity
    const testUrl = 'https://datadashboard.fda.gov/ora/api/complianceactions.json?limit=1';
    logger.info(`Testing: ${testUrl}`);
    
    const response = await fetch(testUrl);
    logger.info(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      logger.info('✅ FDA API is accessible');
      logger.info('Sample data:', JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      logger.info('❌ FDA API returned error:', response.status, response.statusText);
    }
  } catch (error) {
    logger.info('❌ Network error:', error.message);
  }
}

checkFDAAPI();
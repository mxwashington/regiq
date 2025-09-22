// Simple test to check FDA API without authentication
async function checkFDAAPI() {
  console.log('🔍 Checking FDA Data Dashboard API availability...');
  
  try {
    // Test basic connectivity
    const testUrl = 'https://datadashboard.fda.gov/ora/api/complianceactions.json?limit=1';
    console.log(`Testing: ${testUrl}`);
    
    const response = await fetch(testUrl);
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ FDA API is accessible');
      console.log('Sample data:', JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      console.log('❌ FDA API returned error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

checkFDAAPI();
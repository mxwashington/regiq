// Test the enhanced data collection pipeline
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://piyikxxgoekawboitrzz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94'
);

async function testEnhancedPipeline() {
  console.log('🚀 Testing Enhanced Data Collection Pipeline...');
  
  try {
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-collection', {
      body: { 
        manual_trigger: true,
        force_refresh: true,
        debug: true
      }
    });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    if (error) {
      console.error('❌ Pipeline Error:', error);
      return;
    }
    
    console.log(`✅ Pipeline completed successfully in ${duration}s`);
    console.log('📊 Results:', JSON.stringify(data, null, 2));
    
    // Check if we got any new alerts
    if (data.totalSaved > 0) {
      console.log(`🎉 Success! ${data.totalSaved} new alerts saved out of ${data.totalProcessed} processed`);
      
      // Show breakdown by source
      if (data.sources) {
        console.log('📈 Source breakdown:');
        console.log(`  • EPA: ${data.sources.epa || 0} alerts`);
        console.log(`  • FSIS: ${data.sources.fsis || 0} alerts`);
        console.log(`  • FDA: ${data.sources.fda || 0} alerts`);
        console.log(`  • Federal Register: ${data.sources.federalRegister || 0} alerts`);
      }
    } else {
      console.log('⚠️  No new alerts were saved (might be duplicates or empty responses)');
    }
    
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

// Also check recent alerts to see the current state
async function checkRecentAlerts() {
  console.log('\n📋 Checking recent alerts...');
  
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('id, title, source, agency, urgency, created_at, data_classification')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Database Error:', error);
      return;
    }
    
    const liveCount = data.filter(a => a.data_classification === 'live').length;
    const demoCount = data.filter(a => a.data_classification === 'demo').length;
    
    console.log(`📊 Found ${data.length} recent alerts: ${liveCount} live, ${demoCount} demo`);
    
    if (data.length > 0) {
      console.log('\n🔍 Most recent alerts:');
      data.slice(0, 5).forEach((alert, i) => {
        const icon = alert.data_classification === 'live' ? '🔥' : '📚';
        console.log(`  ${i + 1}. ${icon} [${alert.urgency}] ${alert.title.substring(0, 80)}...`);
        console.log(`     Source: ${alert.source} | Agency: ${alert.agency} | ${new Date(alert.created_at).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Exception checking alerts:', error.message);
  }
}

async function main() {
  await checkRecentAlerts();
  await testEnhancedPipeline();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
  await checkRecentAlerts();
}

main().catch(console.error);
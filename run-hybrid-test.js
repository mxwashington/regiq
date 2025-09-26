import { logger } from '@/lib/logger';

// Test hybrid pipeline with focus on FDA sources
const testHybridPipeline = async () => {
    logger.info('🚀 Testing Hybrid FDA Pipeline...');
    const startTime = Date.now();
    
    try {
        const response = await fetch('https://piyikxxgoekawboitrzz.supabase.co/functions/v1/enhanced-regulatory-data-pipeline', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94'
            },
            body: JSON.stringify({ 
                force_refresh: true,
                agency: 'FDA'
            })
        });

        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`❌ Pipeline failed (${response.status}):`, errorText);
            return;
        }

        const result = await response.json();
        
        logger.info(`✅ Pipeline completed in ${executionTime} seconds`);
        logger.info('📊 Results:', JSON.stringify(result, null, 2));
        
        // Check for FDA compliance alerts specifically
        if (result.results) {
            const fdaResults = Object.entries(result.results)
                .filter(([key]) => key.includes('FDA'))
                .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {});
            
            logger.info('🏥 FDA-specific results:', fdaResults);
        }
        
    } catch (error) {
        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;
        logger.error(`💥 Pipeline error after ${executionTime}s:`, error.message);
    }
};

// Run the test
testHybridPipeline();
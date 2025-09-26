#!/usr/bin/env tsx
// Backfill alerts from the last 30 days
// Usage: npm run backfill:alerts

import { comprehensiveAlertSyncService } from '../src/services/ComprehensiveAlertSyncService';

async function main() {
  console.log('🚀 Starting 30-day alert backfill...\n');

  const startTime = Date.now();

  try {
    // Sync alerts from all sources for the last 30 days
    const results = await comprehensiveAlertSyncService.syncAllSources(30);

    console.log('\n📊 Backfill Results Summary:');
    console.log('================================');

    let totalFetched = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const result of results) {
      const duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;
      const success = result.success ? '✅' : '❌';

      console.log(`\n${success} ${result.source}:`);
      console.log(`   Duration: ${duration.toFixed(1)}s`);
      console.log(`   Fetched: ${result.alertsFetched}`);
      console.log(`   Inserted: ${result.alertsInserted}`);
      console.log(`   Updated: ${result.alertsUpdated}`);
      console.log(`   Skipped: ${result.alertsSkipped}`);

      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(error => {
          console.log(`     - ${error}`);
        });
        if (result.errors.length > 3) {
          console.log(`     ... and ${result.errors.length - 3} more`);
        }
      }

      totalFetched += result.alertsFetched;
      totalInserted += result.alertsInserted;
      totalUpdated += result.alertsUpdated;
      totalSkipped += result.alertsSkipped;
      totalErrors += result.errors.length;
    }

    const totalDuration = (Date.now() - startTime) / 1000;

    console.log('\n🎯 Overall Summary:');
    console.log('==================');
    console.log(`Total Duration: ${totalDuration.toFixed(1)}s`);
    console.log(`Total Fetched: ${totalFetched}`);
    console.log(`Total Inserted: ${totalInserted}`);
    console.log(`Total Updated: ${totalUpdated}`);
    console.log(`Total Skipped: ${totalSkipped}`);
    console.log(`Total Errors: ${totalErrors}`);

    const successfulSources = results.filter(r => r.success).length;
    console.log(`\nSuccessful Sources: ${successfulSources}/${results.length}`);

    if (totalErrors > 0) {
      console.log('\n⚠️  Some errors occurred during backfill. Check logs above for details.');
      process.exit(1);
    }

    if (totalInserted + totalUpdated === 0) {
      console.log('\n⚠️  No alerts were inserted or updated. This might indicate:');
      console.log('   - All alerts for this period were already in the database');
      console.log('   - API endpoints returned no data');
      console.log('   - Connection or authentication issues');
    } else {
      console.log(`\n✅ Backfill completed successfully! ${totalInserted + totalUpdated} alerts processed.`);
    }

    // Get current database stats
    try {
      const stats = await comprehensiveAlertSyncService.getSyncStatus();
      console.log('\n📈 Current Database Stats:');
      console.log(`Total Alerts: ${stats.totalAlerts}`);
      console.log(`Recent Alerts (7 days): ${stats.recentAlerts}`);
      console.log('By Source:');
      Object.entries(stats.alertsBySource).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
      });
    } catch (error) {
      console.warn('Failed to fetch database stats:', error);
    }

  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}
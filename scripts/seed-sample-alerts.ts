#!/usr/bin/env tsx
// Seed sample alerts for development and demo purposes
// Usage: npm run seed:alerts

import { supabase } from '../src/integrations/supabase/client';
import { computeAlertHash, normalizeExternalId } from '../src/lib/alerts-schema';

// Sample alert data for each agency
const SAMPLE_ALERTS = [
  // FDA Sample Alerts
  {
    external_id: normalizeExternalId('FDA-2024-001'),
    source: 'FDA' as const,
    title: 'Voluntary Recall of XYZ Brand Peanut Butter Due to Possible Salmonella Contamination',
    summary: 'XYZ Company is voluntarily recalling all lots of XYZ Brand Peanut Butter because they have the potential to be contaminated with Salmonella, an organism which can cause serious and sometimes fatal infections in young children, frail or elderly people, and others with weakened immune systems.',
    link_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/xyz-company-recalls-peanut-butter-products-due-possible-salmonella-contamination',
    date_published: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    date_updated: null,
    jurisdiction: 'United States',
    locations: ['CA', 'TX', 'FL', 'NY'],
    product_types: ['Food', 'Peanut Butter'],
    category: 'recall',
    severity: 85,
    raw: {
      recall_number: 'FDA-2024-001',
      classification: 'Class I',
      product_description: 'XYZ Brand Peanut Butter, all sizes',
      company_name: 'XYZ Company',
      reason_for_recall: 'Possible Salmonella contamination',
      recall_initiation_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      state: 'CA',
      distribution_pattern: 'CA, TX, FL, NY'
    }
  },
  {
    external_id: normalizeExternalId('FDA-2024-002'),
    source: 'FDA' as const,
    title: 'ABC Pharmaceuticals Recalls Blood Pressure Medication Due to Impurity',
    summary: 'ABC Pharmaceuticals is recalling specific lots of blood pressure medication due to the presence of a nitrosamine impurity above acceptable levels.',
    link_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/abc-pharmaceuticals-recalls-blood-pressure-medication',
    date_published: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    date_updated: null,
    jurisdiction: 'United States',
    locations: ['IL', 'OH', 'PA'],
    product_types: ['Drug', 'Blood Pressure Medication'],
    category: 'recall',
    severity: 70,
    raw: {
      recall_number: 'FDA-2024-002',
      classification: 'Class II',
      product_description: 'ABC Blood Pressure Tablets, 10mg',
      company_name: 'ABC Pharmaceuticals',
      reason_for_recall: 'Nitrosamine impurity above acceptable levels',
      recall_initiation_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      state: 'IL'
    }
  },
  // FSIS Sample Alerts
  {
    external_id: normalizeExternalId('FSIS-2024-003'),
    source: 'FSIS' as const,
    title: 'DEF Foods Recalls Ground Beef Products Due to Possible E. coli O157:H7 Contamination',
    summary: 'DEF Foods is recalling approximately 120,000 pounds of ground beef products that may be contaminated with E. coli O157:H7.',
    link_url: 'https://www.fsis.usda.gov/recalls-alerts/def-foods-recalls-ground-beef-products-due-possible-e-coli-o157h7-contamination',
    date_published: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    date_updated: null,
    jurisdiction: 'United States',
    locations: ['TX', 'OK', 'NM'],
    product_types: ['Beef', 'Ground Beef'],
    category: 'recall',
    severity: 90,
    raw: {
      recallNumber: 'FSIS-2024-003',
      productName: 'DEF Ground Beef, 1lb packages',
      companyName: 'DEF Foods',
      recallDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      recallClass: 'Class I',
      reasonForRecall: 'Possible E. coli O157:H7 contamination',
      distributionPattern: 'Texas, Oklahoma, New Mexico'
    }
  },
  // CDC Sample Alerts
  {
    external_id: normalizeExternalId('CDC-2024-004'),
    source: 'CDC' as const,
    title: 'Multistate Outbreak of Salmonella Infections Linked to Pet Turtles',
    summary: 'CDC is investigating a multistate outbreak of Salmonella infections linked to contact with pet turtles. As of the latest update, 42 people infected with the outbreak strain have been reported from 15 states.',
    link_url: 'https://www.cdc.gov/salmonella/turtle-2024/index.html',
    date_published: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    date_updated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Updated 1 day ago
    jurisdiction: 'United States',
    locations: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'TN'],
    product_types: ['Pet Turtles'],
    category: 'outbreak',
    severity: 75,
    raw: {
      id: 'CDC-2024-004',
      title: 'Multistate Outbreak of Salmonella Infections Linked to Pet Turtles',
      investigation_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      investigation_status: 'active',
      illnesses: 42,
      hospitalizations: 12,
      deaths: 0,
      states_affected: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'TN'],
      pathogen: 'Salmonella',
      food_vehicle: ['Pet Turtles']
    }
  },
  // EPA Sample Alerts
  {
    external_id: normalizeExternalId('EPA-2024-005'),
    source: 'EPA' as const,
    title: 'GHI Chemical Company Agrees to $2.5 Million Settlement for Clean Air Act Violations',
    summary: 'GHI Chemical Company has agreed to pay a $2.5 million civil penalty and implement pollution controls costing an estimated $15 million to resolve violations of the Clean Air Act at its chemical manufacturing facility.',
    link_url: 'https://www.epa.gov/enforcement/ghi-chemical-company-settlement-clean-air-act-violations',
    date_published: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    date_updated: null,
    jurisdiction: 'Louisiana',
    locations: ['LA'],
    product_types: ['Chemical Manufacturing'],
    category: 'enforcement',
    severity: 80,
    raw: {
      case_number: 'EPA-2024-005',
      defendant_entity: 'GHI Chemical Company',
      settlement_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      penalty_amount: 2500000,
      action_type: 'settlement',
      state: 'LA',
      environmental_media: ['Air'],
      case_summary: 'Settlement for Clean Air Act violations at chemical manufacturing facility'
    }
  }
];

async function seedSampleAlerts() {
  console.log('🌱 Seeding sample alerts...\n');

  let insertedCount = 0;
  let errorCount = 0;

  for (const alert of SAMPLE_ALERTS) {
    try {
      // Compute hash for the alert
      const hash = computeAlertHash(
        alert.source,
        alert.external_id,
        alert.date_updated,
        alert.date_published
      );

      // Use the improved upsert function
      const { data, error } = await supabase.rpc('upsert_alert_improved', {
        p_external_id: alert.external_id,
        p_source: alert.source,
        p_title: alert.title,
        p_summary: alert.summary,
        p_link_url: alert.link_url,
        p_date_published: alert.date_published,
        p_date_updated: alert.date_updated,
        p_jurisdiction: alert.jurisdiction,
        p_locations: alert.locations,
        p_product_types: alert.product_types,
        p_category: alert.category,
        p_severity: alert.severity,
        p_raw: alert.raw,
        p_hash: hash,
      });

      if (error) {
        console.error(`❌ Failed to insert ${alert.source} alert ${alert.external_id}:`, error);
        errorCount++;
      } else {
        const action = data?.[0]?.action || 'unknown';
        console.log(`✅ ${alert.source} alert ${alert.external_id}: ${action}`);
        if (action === 'inserted') {
          insertedCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Exception inserting ${alert.source} alert ${alert.external_id}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log('==================');
  console.log(`Total Alerts: ${SAMPLE_ALERTS.length}`);
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some alerts failed to insert. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ Sample alerts seeded successfully!');
  }
}

async function main() {
  try {
    await seedSampleAlerts();
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
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
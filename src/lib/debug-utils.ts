import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface DebugInfo {
  configurationValid: boolean;
  networkOnline: boolean;
  databaseConnection: boolean;
  alertsTableExists: boolean;
  sampleAlert: any;
  errors: string[];
}

// Global debug function
export const debugRegIQ = async (): Promise<DebugInfo> => {
  logger.info('=== RegIQ Debug Information ===');
  
  const debug: DebugInfo = {
    configurationValid: false,
    networkOnline: navigator.onLine,
    databaseConnection: false,
    alertsTableExists: false,
    sampleAlert: null,
    errors: []
  };

  try {
    // 1. Check configuration
    logger.info('1. Checking configuration...');
    if (!supabase) {
      debug.errors.push('Supabase client not initialized');
      return debug;
    }
    debug.configurationValid = true;
    logger.info('✅ Supabase client initialized');

    // 2. Check network connectivity
    logger.info('2. Checking network connectivity...');
    logger.info(`Network status: ${debug.networkOnline ? 'Online' : 'Offline'}`);

    // 3. Test basic database connection
    logger.info('3. Testing database connection...');
    try {
      const { count: connectionTest, error: connectionError } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .limit(0);
      
      if (connectionError) {
        debug.errors.push(`Database connection failed: ${connectionError.message}`);
        logger.error('❌ Database connection failed:', connectionError);
      } else {
        debug.databaseConnection = true;
        logger.info('✅ Database connection successful');
      }
    } catch (error: any) {
      debug.errors.push(`Database connection error: ${error.message}`);
      logger.error('❌ Database connection error:', error);
    }

    // 4. Check if alerts table exists and get structure
    logger.info('4. Checking alerts table...');
    try {
      const { data: tableTest, error: tableError } = await supabase
        .from('alerts')
        .select('*')
        .limit(1);
      
      if (tableError) {
        if (tableError.code === 'PGRST116') {
          debug.errors.push('Alerts table does not exist or no access permissions');
          logger.error('❌ Alerts table not accessible:', tableError);
        } else {
          debug.errors.push(`Table access error: ${tableError.message}`);
          logger.error('❌ Table access error:', tableError);
        }
      } else {
        debug.alertsTableExists = true;
        debug.sampleAlert = tableTest?.[0] || null;
        logger.info('✅ Alerts table accessible');
        logger.info('Table structure:', tableTest?.[0] ? Object.keys(tableTest[0]) : 'No data');
      }
    } catch (error: any) {
      debug.errors.push(`Table verification error: ${error.message}`);
      logger.error('❌ Table verification error:', error);
    }

    // 5. Try to load a few alerts
    logger.info('5. Testing alert loading...');
    try {
      const { data: alerts, error: alertsError } = await supabase
        .from('alerts')
        .select(`
          id,
          title,
          summary,
          urgency,
          source,
          published_date,
          external_url
        `)
        .order('published_date', { ascending: false })
        .limit(5);
      
      if (alertsError) {
        debug.errors.push(`Alert loading failed: ${alertsError.message}`);
        logger.error('❌ Alert loading failed:', alertsError);
      } else {
        logger.info(`✅ Successfully loaded ${alerts?.length || 0} alerts`);
        logger.info('Sample alerts:', alerts?.slice(0, 2));
      }
    } catch (error: any) {
      debug.errors.push(`Alert loading error: ${error.message}`);
      logger.error('❌ Alert loading error:', error);
    }

    // 6. Test complex query with joins
    logger.info('6. Testing complex tagged alerts query...');
    try {
      const { data: taggedAlerts, error: taggedError } = await supabase
        .from('alerts')
        .select(`
          id,
          title,
          alert_tags (
            id,
            taxonomy_tags (
              id,
              name
            )
          )
        `)
        .limit(1);
      
      if (taggedError) {
        debug.errors.push(`Tagged alerts query failed: ${taggedError.message}`);
        logger.error('❌ Tagged alerts query failed:', taggedError);
      } else {
        logger.info('✅ Tagged alerts query successful');
      }
    } catch (error: any) {
      debug.errors.push(`Tagged alerts query error: ${error.message}`);
      logger.error('❌ Tagged alerts query error:', error);
    }

  } catch (error: any) {
    debug.errors.push(`General debug error: ${error.message}`);
    logger.error('❌ General debug error:', error);
  }

  logger.info('=== Debug Summary ===');
  logger.info('Configuration valid:', debug.configurationValid);
  logger.info('Network online:', debug.networkOnline);
  logger.info('Database connection:', debug.databaseConnection);
  logger.info('Alerts table exists:', debug.alertsTableExists);
  logger.info('Errors:', debug.errors);
  
  return debug;
};

// Make debug function available globally
declare global {
  interface Window {
    debugRegIQ: typeof debugRegIQ;
    regiqDebug?: any;
  }
}

if (typeof window !== 'undefined') {
  window.debugRegIQ = debugRegIQ;
  logger.info('RegIQ Debug: Run window.debugRegIQ() to diagnose issues');
}

export const fallbackAlerts = [
  {
    id: 'fallback-1',
    title: 'RegIQ Service Notice',
    summary: 'We are experiencing technical difficulties loading the latest regulatory alerts. Our team is working to resolve this issue. Please try refreshing the page or check back in a few minutes.',
    urgency: 'medium',
    source: 'RegIQ System',
    published_date: new Date().toISOString(),
    external_url: '',
    isFallback: true
  },
  {
    id: 'fallback-2', 
    title: 'Data Loading Issue',
    summary: 'If this message persists, please contact support or try the troubleshooting steps in the error details.',
    urgency: 'low',
    source: 'RegIQ System',
    published_date: new Date().toISOString(),
    external_url: '',
    isFallback: true
  }
];
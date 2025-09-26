import { supabase } from '@/integrations/supabase/client';

export const testDatabaseConnectivity = async () => {
  const results = {
    supabaseClient: false,
    basicQuery: false,
    authTest: false,
    profilesTable: false,
    alertsTable: false,
    rpcFunctions: false,
    errors: [] as string[]
  };

  try {
    // Test 1: Basic Supabase client
    if (supabase) {
      results.supabaseClient = true;
      console.log('✅ Supabase client initialized');
    }

    // Test 2: Basic query (should work without auth)
    try {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.errors.push(`Basic query error: ${error.message}`);
        console.error('❌ Basic query failed:', error);
      } else {
        results.basicQuery = true;
        console.log('✅ Basic database query works');
      }
    } catch (e) {
      results.errors.push(`Basic query exception: ${e}`);
    }

    // Test 3: Auth session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        results.errors.push(`Auth session error: ${error.message}`);
        console.error('❌ Auth session failed:', error);
      } else {
        results.authTest = true;
        console.log('✅ Auth session test passed', { hasSession: !!session });
      }
    } catch (e) {
      results.errors.push(`Auth session exception: ${e}`);
    }

    // Test 4: Profiles table access (requires auth)
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.errors.push(`Profiles table error: ${error.message}`);
        console.error('❌ Profiles table access failed (RLS may be blocking):', error);
      } else {
        results.profilesTable = true;
        console.log('✅ Profiles table accessible');
      }
    } catch (e) {
      results.errors.push(`Profiles table exception: ${e}`);
    }

    // Test 5: Alerts table access
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title')
        .limit(1);

      if (error) {
        results.errors.push(`Alerts table error: ${error.message}`);
        console.error('❌ Alerts table access failed:', error);
      } else {
        results.alertsTable = true;
        console.log('✅ Alerts table accessible', { sampleData: !!data?.length });
      }
    } catch (e) {
      results.errors.push(`Alerts table exception: ${e}`);
    }

    // Test 6: RPC functions
    try {
      const { data, error } = await supabase.rpc('update_user_activity', {
        user_id_param: '00000000-0000-0000-0000-000000000000', // dummy ID
        ip_address_param: null
      });

      if (error) {
        results.errors.push(`RPC function error: ${error.message}`);
        console.error('❌ RPC function call failed:', error);
      } else {
        results.rpcFunctions = true;
        console.log('✅ RPC functions accessible');
      }
    } catch (e) {
      results.errors.push(`RPC function exception: ${e}`);
    }

  } catch (e) {
    results.errors.push(`Database connectivity test failed: ${e}`);
    console.error('❌ Database connectivity test failed:', e);
  }

  return results;
};

export const runDatabaseDiagnostics = async () => {
  console.log('🔍 Running database diagnostics...');
  const results = await testDatabaseConnectivity();

  console.log('\n📊 Database Connectivity Results:');
  console.log('Supabase Client:', results.supabaseClient ? '✅' : '❌');
  console.log('Basic Query:', results.basicQuery ? '✅' : '❌');
  console.log('Auth Test:', results.authTest ? '✅' : '❌');
  console.log('Profiles Table:', results.profilesTable ? '✅' : '❌');
  console.log('Alerts Table:', results.alertsTable ? '✅' : '❌');
  console.log('RPC Functions:', results.rpcFunctions ? '✅' : '❌');

  if (results.errors.length > 0) {
    console.log('\n❌ Errors found:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  return results;
};
#!/usr/bin/env node

// Quick script to check user count and activity
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    // Get profiles (which should have user data)
    const { data: profiles, error: profilesError, count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);

      // Try to get just the count
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error fetching count:', countError);
        console.log('Unable to access user data');
        return;
      }

      console.log(`Total users: ${count || 0}`);
      return;
    }

    console.log(`\n=== User Statistics ===`);
    console.log(`Total users: ${totalUsers || 0}`);

    if (profiles && profiles.length > 0) {
      console.log(`\n=== Recent Users ===`);

      // Show last 10 users
      const recent = profiles.slice(0, 10);
      recent.forEach((profile, index) => {
        const created = profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown';
        const updated = profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never';
        const email = profile.email || profile.id?.substring(0, 8) + '...' || 'Unknown';

        console.log(`${index + 1}. ${email}`);
        console.log(`   Created: ${created}`);
        console.log(`   Last active: ${updated}`);
        console.log('');
      });

      // Activity analysis
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeLastWeek = profiles.filter(p =>
        p.updated_at && new Date(p.updated_at) > last7Days
      ).length;

      const activeLastMonth = profiles.filter(p =>
        p.updated_at && new Date(p.updated_at) > last30Days
      ).length;

      console.log(`=== Activity Summary ===`);
      console.log(`Active in last 7 days: ${activeLastWeek}`);
      console.log(`Active in last 30 days: ${activeLastMonth}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
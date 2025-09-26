// Admin Settings API Route
// System configuration and management

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminFromRequest } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminProfile = await verifyAdminFromRequest(request);
    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Get system configuration
    const { data: config, error: configError } = await supabase
      .from('system_config')
      .select('*')
      .single();

    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching system config:', configError);
      return NextResponse.json(
        { error: 'Failed to fetch system configuration' },
        { status: 500 }
      );
    }

    // Get RLS policies
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('get_rls_policies');

    if (rlsError) {
      console.error('Error fetching RLS policies:', rlsError);
    }

    // Get admin users
    const { data: adminUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, role, last_login, created_at, enabled')
      .in('role', ['admin', 'super_admin', 'viewer']);

    if (usersError) {
      console.error('Error fetching admin users:', usersError);
    }

    // Get database statistics
    const { data: dbStats, error: statsError } = await supabase
      .rpc('get_database_stats');

    if (statsError) {
      console.error('Error fetching database stats:', statsError);
    }

    // Default configuration if none exists
    const defaultConfig = {
      sync_schedule: '0 */4 * * *',
      max_alerts_per_sync: 1000,
      retention_days: 365,
      auto_dedupe_enabled: true,
      rate_limit_per_hour: 1000,
      maintenance_mode: false,
      webhook_url: null,
      notification_email: null
    };

    return NextResponse.json({
      config: config || defaultConfig,
      rls_policies: rlsPolicies || [],
      admin_users: adminUsers || [],
      database_stats: dbStats || {
        total_alerts: 0,
        total_size: '0 MB',
        oldest_alert: new Date().toISOString(),
        newest_alert: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Admin settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
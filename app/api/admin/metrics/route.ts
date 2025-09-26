// Admin Metrics API Route
// Provides KPI data for the admin dashboard

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

    // Get total alerts count
    const { count: totalAlerts, error: totalError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error fetching total alerts:', totalError);
      return NextResponse.json(
        { error: 'Failed to fetch total alerts' },
        { status: 500 }
      );
    }

    // Get alerts from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: last24hAlerts, error: last24hError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    if (last24hError) {
      console.error('Error fetching 24h alerts:', last24hError);
      return NextResponse.json(
        { error: 'Failed to fetch recent alerts' },
        { status: 500 }
      );
    }

    // Get sources health data
    const { data: sourcesHealth, error: healthError } = await supabase
      .rpc('get_sources_health');

    if (healthError) {
      console.error('Error fetching sources health:', healthError);
      return NextResponse.json(
        { error: 'Failed to fetch sources health' },
        { status: 500 }
      );
    }

    // Get sparkline data (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sparklineData, error: sparklineError } = await supabase
      .rpc('get_daily_alert_counts', {
        start_date: sevenDaysAgo.split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

    if (sparklineError) {
      console.error('Error fetching sparkline data:', sparklineError);
      return NextResponse.json(
        { error: 'Failed to fetch sparkline data' },
        { status: 500 }
      );
    }

    // Get duplicates count
    const { count: duplicatesCount, error: duplicatesError } = await supabase
      .rpc('count_potential_duplicates');

    if (duplicatesError) {
      console.error('Error fetching duplicates count:', duplicatesError);
    }

    // Get last sync time
    const { data: lastSync, error: syncError } = await supabase
      .from('sync_logs')
      .select('run_started')
      .eq('status', 'success')
      .order('run_started', { ascending: false })
      .limit(1)
      .single();

    if (syncError && syncError.code !== 'PGRST116') {
      console.error('Error fetching last sync:', syncError);
    }

    const response = {
      totalAlerts: totalAlerts || 0,
      last24hAlerts: last24hAlerts || 0,
      sourcesHealth: sourcesHealth || [],
      sparklineData: sparklineData || [],
      duplicatesCount: duplicatesCount || 0,
      lastSyncTime: lastSync?.run_started || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin metrics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// Admin Sync API Route
// Manual sync triggers for data pipeline

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminFromRequest } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const adminProfile = await verifyAdminFromRequest(request);
    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { days = 1, sources = [] } = body;

    const supabase = createClient();

    // Check if a sync is already running
    const { data: runningSyncs, error: runningError } = await supabase
      .from('sync_logs')
      .select('id')
      .eq('status', 'running')
      .limit(1);

    if (runningError) {
      console.error('Error checking running syncs:', runningError);
      return NextResponse.json(
        { error: 'Failed to check sync status' },
        { status: 500 }
      );
    }

    if (runningSyncs && runningSyncs.length > 0) {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      );
    }

    // Trigger manual sync via RPC
    const { data: syncResult, error: syncError } = await supabase
      .rpc('trigger_manual_sync', {
        days_back: days,
        source_filter: sources.length > 0 ? sources : null,
        triggered_by: adminProfile.email
      });

    if (syncError) {
      console.error('Error triggering sync:', syncError);
      return NextResponse.json(
        { error: 'Failed to trigger sync' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      syncId: syncResult?.sync_id,
      message: `Manual sync initiated for last ${days} day(s)`,
      results: syncResult?.results || []
    });
  } catch (error) {
    console.error('Admin sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
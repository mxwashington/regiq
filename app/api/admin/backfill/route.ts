// Admin Backfill API Route
// Large-scale data backfill operations

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
    const { days = 30, sources = [] } = body;

    // Validate days parameter
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 365' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Check if a backfill is already running
    const { data: runningBackfills, error: runningError } = await supabase
      .from('sync_logs')
      .select('id')
      .eq('status', 'running')
      .eq('trigger_type', 'backfill')
      .limit(1);

    if (runningError) {
      console.error('Error checking running backfills:', runningError);
      return NextResponse.json(
        { error: 'Failed to check backfill status' },
        { status: 500 }
      );
    }

    if (runningBackfills && runningBackfills.length > 0) {
      return NextResponse.json(
        { error: 'Backfill already in progress' },
        { status: 409 }
      );
    }

    // Trigger backfill via RPC
    const { data: backfillResult, error: backfillError } = await supabase
      .rpc('trigger_backfill', {
        days_back: days,
        source_filter: sources.length > 0 ? sources : null,
        triggered_by: adminProfile.email
      });

    if (backfillError) {
      console.error('Error triggering backfill:', backfillError);
      return NextResponse.json(
        { error: 'Failed to trigger backfill' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      backfillId: backfillResult?.backfill_id,
      message: `Backfill initiated for last ${days} day(s)`,
      estimatedDuration: Math.ceil(days / 7) + ' minutes',
      results: backfillResult?.results || []
    });
  } catch (error) {
    console.error('Admin backfill error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
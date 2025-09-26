// Admin Dedupe API Route
// Duplicate detection and removal

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

    const supabase = createClient();

    // Run deduplication via RPC
    const { data: dedupeResult, error: dedupeError } = await supabase
      .rpc('deduplicate_alerts', {
        triggered_by: adminProfile.email
      });

    if (dedupeError) {
      console.error('Error running deduplication:', dedupeError);
      return NextResponse.json(
        { error: 'Failed to run deduplication' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      removedCount: dedupeResult?.removed_count || 0,
      message: `Removed ${dedupeResult?.removed_count || 0} duplicate alerts`,
      details: dedupeResult?.details || {}
    });
  } catch (error) {
    console.error('Admin dedupe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
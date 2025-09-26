// Admin Reindex API Route
// Database reindexing operations

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

    // Run database reindexing via RPC
    const { data: reindexResult, error: reindexError } = await supabase
      .rpc('reindex_database', {
        triggered_by: adminProfile.email
      });

    if (reindexError) {
      console.error('Error running reindex:', reindexError);
      return NextResponse.json(
        { error: 'Failed to reindex database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      indexesCreated: reindexResult?.indexes_created || 0,
      message: `Created ${reindexResult?.indexes_created || 0} database indexes`,
      duration: reindexResult?.duration || '0s',
      details: reindexResult?.details || {}
    });
  } catch (error) {
    console.error('Admin reindex error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
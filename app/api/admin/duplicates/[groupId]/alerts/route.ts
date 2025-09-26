// Admin Duplicate Group Alerts API Route
// Get alerts within a specific duplicate group

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminFromRequest } from '@/lib/admin-auth';

interface Params {
  groupId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Verify admin access
    const adminProfile = await verifyAdminFromRequest(request);
    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = params;

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get alerts for the duplicate group
    const { data: alerts, error: alertsError } = await supabase
      .rpc('get_duplicate_group_alerts', {
        group_id: groupId
      });

    if (alertsError) {
      console.error('Error fetching duplicate group alerts:', alertsError);
      return NextResponse.json(
        { error: 'Failed to fetch duplicate group alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alerts: alerts || []
    });
  } catch (error) {
    console.error('Admin duplicate group alerts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// Admin Duplicate Group API Route
// Individual duplicate group management

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminFromRequest } from '@/lib/admin-auth';

interface Params {
  groupId: string;
}

export async function DELETE(
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

    // Remove duplicates for specific group
    const { data: removeResult, error: removeError } = await supabase
      .rpc('remove_duplicate_group', {
        group_id: groupId,
        triggered_by: adminProfile.email
      });

    if (removeError) {
      console.error('Error removing duplicate group:', removeError);
      return NextResponse.json(
        { error: 'Failed to remove duplicate group' },
        { status: 500 }
      );
    }

    // Log the operation
    await supabase
      .from('admin_operations')
      .insert({
        operation_type: 'duplicate_removal',
        performed_by: adminProfile.id,
        details: {
          group_id: groupId,
          removed_count: removeResult?.removed_count || 0
        }
      });

    return NextResponse.json({
      success: true,
      removedCount: removeResult?.removed_count || 0,
      message: `Removed ${removeResult?.removed_count || 0} duplicate alerts`
    });
  } catch (error) {
    console.error('Admin duplicate group deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// Admin RLS API Route
// Emergency RLS controls

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
    const { action } = body; // 'enable' or 'disable'

    if (!action || !['enable', 'disable'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "enable" or "disable"' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Execute RLS action via RPC
    const { data: rlsResult, error: rlsError } = await supabase
      .rpc(action === 'enable' ? 'enable_emergency_rls' : 'disable_emergency_rls', {
        triggered_by: adminProfile.email
      });

    if (rlsError) {
      console.error('Error executing RLS action:', rlsError);
      return NextResponse.json(
        { error: `Failed to ${action} RLS` },
        { status: 500 }
      );
    }

    // Log the operation
    await supabase
      .from('admin_operations')
      .insert({
        operation_type: `rls_${action}`,
        performed_by: adminProfile.id,
        details: rlsResult
      });

    return NextResponse.json({
      success: true,
      action,
      message: `RLS ${action}d successfully`,
      affected_tables: rlsResult?.affected_tables || [],
      details: rlsResult
    });
  } catch (error) {
    console.error('Admin RLS error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
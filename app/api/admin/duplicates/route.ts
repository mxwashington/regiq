// Admin Duplicates API Route
// Duplicate detection and management

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

    // Get duplicate groups
    const { data: duplicateGroups, error: groupsError } = await supabase
      .rpc('get_duplicate_groups');

    if (groupsError) {
      console.error('Error fetching duplicate groups:', groupsError);
      return NextResponse.json(
        { error: 'Failed to fetch duplicate groups' },
        { status: 500 }
      );
    }

    // Get total duplicates count
    const { data: duplicateStats, error: statsError } = await supabase
      .rpc('get_duplicate_stats');

    if (statsError) {
      console.error('Error fetching duplicate stats:', statsError);
    }

    // Get last scan time
    const { data: lastScan, error: scanError } = await supabase
      .from('admin_operations')
      .select('created_at')
      .eq('operation_type', 'duplicate_scan')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (scanError && scanError.code !== 'PGRST116') {
      console.error('Error fetching last scan:', scanError);
    }

    return NextResponse.json({
      groups: duplicateGroups || [],
      total_duplicates: duplicateStats?.total_duplicates || 0,
      total_groups: duplicateGroups?.length || 0,
      potential_space_saved: duplicateStats?.space_saved || 0,
      last_scan: lastScan?.created_at || null
    });
  } catch (error) {
    console.error('Admin duplicates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const adminProfile = await verifyAdminFromRequest(request);
    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Trigger duplicate scan
    const { data: scanResult, error: scanError } = await supabase
      .rpc('scan_for_duplicates', {
        triggered_by: adminProfile.email
      });

    if (scanError) {
      console.error('Error scanning for duplicates:', scanError);
      return NextResponse.json(
        { error: 'Failed to scan for duplicates' },
        { status: 500 }
      );
    }

    // Log the operation
    await supabase
      .from('admin_operations')
      .insert({
        operation_type: 'duplicate_scan',
        performed_by: adminProfile.id,
        details: scanResult
      });

    return NextResponse.json({
      success: true,
      total_groups: scanResult?.groups_found || 0,
      total_duplicates: scanResult?.duplicates_found || 0,
      message: `Scan completed. Found ${scanResult?.groups_found || 0} duplicate groups.`
    });
  } catch (error) {
    console.error('Admin duplicate scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
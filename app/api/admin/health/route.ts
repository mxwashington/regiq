// Admin Health Check API Route
// Health monitoring and status checks

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

    // Get health data via RPC
    const { data: healthData, error: healthError } = await supabase
      .rpc('get_health_status');

    if (healthError) {
      console.error('Error fetching health status:', healthError);
      return NextResponse.json(
        { error: 'Failed to fetch health status' },
        { status: 500 }
      );
    }

    // Determine overall status
    const sources = healthData || [];
    const healthyCount = sources.filter((s: any) => s.status === 'healthy').length;
    const totalCount = sources.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overallStatus = 'healthy';
    } else if (healthyCount >= totalCount * 0.5) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return NextResponse.json({
      sources,
      lastUpdated: new Date().toISOString(),
      overallStatus
    });
  } catch (error) {
    console.error('Admin health check error:', error);
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

    // Trigger manual health check via RPC
    const { data: healthResult, error: healthError } = await supabase
      .rpc('run_health_check', {
        triggered_by: adminProfile.email
      });

    if (healthError) {
      console.error('Error running health check:', healthError);
      return NextResponse.json(
        { error: 'Failed to run health check' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      results: healthResult
    });
  } catch (error) {
    console.error('Admin health check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// Admin Agencies API Route
// Agency management and statistics

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

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const status = searchParams.get('status') || '';
    const jurisdiction = searchParams.get('jurisdiction') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100);

    const supabase = createClient();

    // Get agencies data via RPC with filters
    const { data: agenciesData, error: agenciesError } = await supabase
      .rpc('get_agencies_with_stats', {
        search_term: search || null,
        source_filter: source || null,
        status_filter: status || null,
        jurisdiction_filter: jurisdiction || null,
        page_number: page,
        page_size: pageSize
      });

    if (agenciesError) {
      console.error('Error fetching agencies:', agenciesError);
      return NextResponse.json(
        { error: 'Failed to fetch agencies' },
        { status: 500 }
      );
    }

    // Get filter options
    const { data: sources, error: sourcesError } = await supabase
      .from('alerts')
      .select('source')
      .neq('source', null);

    const { data: jurisdictions, error: jurisdictionsError } = await supabase
      .from('alerts')
      .select('jurisdiction')
      .neq('jurisdiction', null);

    if (sourcesError || jurisdictionsError) {
      console.error('Error fetching filter options:', { sourcesError, jurisdictionsError });
    }

    const uniqueSources = [...new Set(sources?.map(s => s.source).filter(Boolean))] || [];
    const uniqueJurisdictions = [...new Set(jurisdictions?.map(j => j.jurisdiction).filter(Boolean))] || [];

    return NextResponse.json({
      agencies: agenciesData?.agencies || [],
      total: agenciesData?.total || 0,
      sources: uniqueSources,
      jurisdictions: uniqueJurisdictions
    });
  } catch (error) {
    console.error('Admin agencies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
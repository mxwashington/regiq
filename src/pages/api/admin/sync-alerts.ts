// Admin Manual Sync API Route
// Secure endpoint for admin-triggered alert synchronization

import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { comprehensiveAlertSyncService } from '@/services/ComprehensiveAlertSyncService';

interface SyncResponse {
  success: boolean;
  message: string;
  results?: any[];
  summary?: {
    totalFetched: number;
    totalInserted: number;
    totalUpdated: number;
    totalSkipped: number;
    totalErrors: number;
    duration: number;
  };
  error?: string;
}

async function verifyAdminAccess(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  try {
    const supabase = createPagesServerClient({ req, res });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
    });
  }

  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess(req, res);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Admin access required.',
      });
    }

    console.log('Admin sync triggered');

    // Parse request parameters
    const { sinceDays = 1 } = req.body;

    // Validate parameters
    if (typeof sinceDays !== 'number' || sinceDays < 1 || sinceDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sinceDays parameter. Must be between 1 and 365.',
      });
    }

    const startTime = Date.now();

    // Perform the sync
    const results = await comprehensiveAlertSyncService.syncAllSources(sinceDays);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // in seconds

    // Calculate summary statistics
    const summary = {
      totalFetched: results.reduce((sum, r) => sum + r.alertsFetched, 0),
      totalInserted: results.reduce((sum, r) => sum + r.alertsInserted, 0),
      totalUpdated: results.reduce((sum, r) => sum + r.alertsUpdated, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.alertsSkipped, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      duration,
    };

    const allSuccessful = results.every(r => r.success);
    const hasData = summary.totalInserted + summary.totalUpdated > 0;

    console.log('Admin sync completed:', {
      success: allSuccessful,
      summary,
      sources: results.map(r => ({
        source: r.source,
        success: r.success,
        inserted: r.alertsInserted,
        updated: r.alertsUpdated,
        errors: r.errors.length,
      })),
    });

    return res.status(200).json({
      success: allSuccessful,
      message: allSuccessful
        ? `Sync completed successfully in ${duration.toFixed(1)}s. ${summary.totalInserted + summary.totalUpdated} alerts processed.`
        : `Sync completed with ${summary.totalErrors} errors. ${summary.totalInserted + summary.totalUpdated} alerts processed.`,
      results,
      summary,
    });

  } catch (error) {
    console.error('Admin sync failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error during sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Ensure the function doesn't timeout (extend if needed)
export const config = {
  api: {
    responseLimit: false,
    // Extend timeout for long-running sync operations
    externalResolver: true,
  },
};
// Admin Authentication Utilities
// Server-side admin verification and profile management

import { supabase } from '@/integrations/supabase/client';

export interface AdminProfile {
  user_id: string;
  email: string;
  is_admin: boolean;
  role: string | null;
  full_name: string | null;
  created_at: string;
}

export async function getAdminProfile(): Promise<AdminProfile | null> {
  try {
    const supabase = createServerComponentClient({ cookies });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // Get admin profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, is_admin, role, full_name, created_at')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return null;
    }

    return {
      user_id: profile.user_id,
      email: user.email || '',
      is_admin: profile.is_admin,
      role: profile.role,
      full_name: profile.full_name,
      created_at: profile.created_at,
    };
  } catch (error) {
    console.error('Admin auth check failed:', error);
    return null;
  }
}

export async function requireAdmin(): Promise<AdminProfile> {
  const profile = await getAdminProfile();

  if (!profile) {
    redirect('/auth/login?redirect=/admin');
  }

  return profile;
}

export async function verifyAdminFromRequest(request: Request): Promise<AdminProfile | null> {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // Extract auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Verify JWT and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Check admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, is_admin, role, full_name, created_at')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return null;
    }

    return {
      user_id: profile.user_id,
      email: user.email || '',
      is_admin: profile.is_admin,
      role: profile.role,
      full_name: profile.full_name,
      created_at: profile.created_at,
    };
  } catch (error) {
    console.error('Admin verification failed:', error);
    return null;
  }
}
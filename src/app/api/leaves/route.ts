import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET: Fetch all leaves filtered by user's team
export async function GET(request: Request) {
    try {
        const cookieStore = cookies();

        // Create server client with cookies
        const supabase = createServerClient(
            supabaseUrl,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        // Get authenticated user from session OR check for manager mode cookies
        const { data: { user } } = await supabase.auth.getUser();

        const managerSession = cookieStore.get('manager_session')?.value;
        const guestToken = cookieStore.get('guest_token')?.value;
        const isManagerMode = managerSession === 'active' || guestToken === 'manager_access_token_2026';

        if (!user && !isManagerMode) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let profile = null;
        if (user) {
            // Get user's team_id from user_profiles
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('role, team_id')
                .eq('id', user.id)
                .single();
            profile = profileData;
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const overrideTeamId = searchParams.get('team_id');

        // Determine effective team_id
        // Managers (super admins or guest managers) can override team_id
        const isSuperAdmin = (profile as any)?.role === 'super_admin';
        const canOverride = isSuperAdmin || isManagerMode;

        let effectiveTeamId = profile?.team_id;
        if (canOverride) {
            effectiveTeamId = overrideTeamId || null; // Allow fetching ALL teams if no override specified
        }

        if (!effectiveTeamId && !canOverride) {
            return NextResponse.json(
                { error: 'Team ID is required' },
                { status: 400 }
            );
        }

        // Use service role key for querying
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        let query = supabaseAdmin
            .from('leaves')
            .select('*')
            .order('leave_date', { ascending: true });

        if (effectiveTeamId) {
            query = query.eq('team_id', effectiveTeamId);
        }

        // Filter by date range if provided
        if (startDate) {
            query = query.gte('leave_date', startDate);
        }
        if (endDate) {
            query = query.lte('leave_date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching leaves:', error);
            return NextResponse.json(
                { error: 'Failed to fetch leaves' },
                { status: 500 }
            );
        }

        return NextResponse.json({ leaves: data || [] });

    } catch (error: any) {
        console.error('Error in /api/leaves GET:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch leaves' },
            { status: 500 }
        );
    }
}

// POST: Create a new leave request
export async function POST(request: Request) {
    try {
        const cookieStore = cookies();

        // Create server client with cookies
        const supabase = createServerClient(
            supabaseUrl,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        // Get authenticated user from session OR check for manager mode cookies
        const { data: { user } } = await supabase.auth.getUser();

        const managerSession = cookieStore.get('manager_session')?.value;
        const guestToken = cookieStore.get('guest_token')?.value;
        const isManagerMode = managerSession === 'active' || guestToken === 'manager_access_token_2026';

        if (!user && !isManagerMode) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let profile = null;
        if (user) {
            // Get user's team_id from user_profiles
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('role, team_id')
                .eq('id', user.id)
                .single();
            profile = profileData;
        }

        // Use service role key for inserting
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();

        const {
            team_member_id,
            team_member_name,
            leave_date,
            leave_type,
            reason,
            created_by,
            team_id: overrideTeamId
        } = body;

        // Validate required fields
        if (!team_member_id || !team_member_name || !leave_date || !leave_type) {
            return NextResponse.json(
                { error: 'Missing required fields: team_member_id, team_member_name, leave_date, leave_type' },
                { status: 400 }
            );
        }

        // Determine effective team_id
        // CRITICAL FIX: The leave should belong to the TEAM MEMBER'S team, not necessarily the creator's or manager's current view.
        // We must fetch the target user's team_id from user_profiles.
        const { data: targetUserProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('team_id')
            .eq('id', team_member_id)
            .single();

        let effectiveTeamId = targetUserProfile?.team_id;

        // Fallback or Override logic (only if target user has no team?)
        // Generally, the user's profile team_id is the source of truth for where their leaves should show up.
        if (!effectiveTeamId) {
            const isSuperAdmin = (profile as any)?.role === 'super_admin';
            const canOverride = isSuperAdmin || isManagerMode;
            if (canOverride && overrideTeamId) {
                effectiveTeamId = overrideTeamId;
            } else {
                effectiveTeamId = profile?.team_id;
            }
        }

        if (!effectiveTeamId) {
            return NextResponse.json(
                { error: 'Team ID could not be determined for the user' },
                { status: 400 }
            );
        }

        // Insert the leave request with team_id
        const { data, error } = await supabaseAdmin
            .from('leaves')
            .insert([
                {
                    team_member_id,
                    team_member_name,
                    leave_date,
                    leave_type,
                    reason: reason || null,
                    created_by: created_by || null,
                    team_id: effectiveTeamId || overrideTeamId // Add team_id (profile source of truth)
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating leave:', error);
            return NextResponse.json(
                { error: 'Failed to create leave request' },
                { status: 500 }
            );
        }

        return NextResponse.json({ leave: data }, { status: 201 });

    } catch (error: any) {
        console.error('Error in /api/leaves POST:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create leave request' },
            { status: 500 }
        );
    }
}

// DELETE: Delete a leave request
export async function DELETE(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { searchParams } = new URL(request.url);
        const leaveId = searchParams.get('id');

        if (!leaveId) {
            return NextResponse.json(
                { error: 'Missing leave ID' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('leaves')
            .delete()
            .eq('id', leaveId);

        if (error) {
            console.error('Error deleting leave:', error);
            return NextResponse.json(
                { error: 'Failed to delete leave request' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error in /api/leaves DELETE:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete leave request' },
            { status: 500 }
        );
    }
}

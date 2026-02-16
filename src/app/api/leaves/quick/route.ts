import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to get IST Date YYYY-MM-DD
function getISTDateString() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
    return istDate.toISOString().split('T')[0];
}

export async function POST(request: Request) {
    try {
        const cookieStore = cookies();
        const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; }
            }
        });

        // 1. Auth Check (User or Manager)
        const { data: { user } } = await supabase.auth.getUser();

        const managerSession = cookieStore.get('manager_session')?.value;
        const guestToken = cookieStore.get('guest_token')?.value;
        const isManagerMode = managerSession === 'active' || guestToken === 'manager_access_token_2026';

        if (!user && !isManagerMode) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { team_member_name, team_id, leave_type, date } = body;

        // Default to TODAY (IST) if date not provided
        const targetDate = date || getISTDateString();

        if (!team_member_name || !leave_type) {
            return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 });
        }

        // Use Admin Client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Resolve Team Member ID (from auth users or just simple store by name if we lack ID mapping?)
        // The existing `leaves` table requires `team_member_id`.
        // We need to find the user profile.

        // Search by name in user_profiles?
        // Note: `team_member_name` in the tracker comes from `assigned_to` column in tasks.
        // It might not perfectly match `user_profiles.full_name`.
        // However, standard flow is mapped.
        // Let's try to find the user.

        const { data: userData, error: userError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, team_id')
            .ilike('full_name', team_member_name)
            .single();

        let targetUserId = userData?.id;
        let targetTeamId = team_id || userData?.team_id;

        if (!targetUserId) {
            // Fallback: This might be a legacy user or name mismatch.
            // If we can't find ID, we can't insert into `leaves` effectively if it enforces FK.
            // If it doesn't enforce FK, we can use a placeholder?
            // Checking existing `leaves` table logic: The POST route requires `team_member_id`.
            // If we can't find the user, we should probably error or try a loose match.
            // For now, let's assume we find them. If not, fail.
            // Wait, existing manual LeaveModal asks user to SELECT assignee from a dropdown of USERS.
            // So Task Assignee "should" be a real user.

            // If task assignee is just a text string that doesn't match, we have a problem.
            // Let's try to search strictly first.
            console.warn(`Could not find user profile for ${team_member_name}`);

            // If we fail, we might return an error that "User must be registered".
            return NextResponse.json({ error: `User '${team_member_name}' not found` }, { status: 404 });
        }

        // 3. Upsert Logic:
        // Check if leave exists for this user on this date.
        const { data: existingLeave } = await supabaseAdmin
            .from('leaves')
            .select('id')
            .eq('team_member_id', targetUserId)
            .eq('leave_date', targetDate)
            .single();

        let result;
        if (existingLeave) {
            // Update
            result = await supabaseAdmin
                .from('leaves')
                .update({
                    leave_type,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingLeave.id)
                .select()
                .single();
        } else {
            // Insert
            result = await supabaseAdmin
                .from('leaves')
                .insert([{
                    team_member_id: targetUserId,
                    team_member_name: team_member_name, // Store the display name
                    leave_date: targetDate,
                    leave_type,
                    status: 'Approved', // Quick actions assumed auto-approved? Or Pending? Assuming Approved for tracker visibility.
                    team_id: targetTeamId
                }])
                .select()
                .single();
        }

        if (result.error) throw result.error;

        return NextResponse.json({ success: true, leave: result.data });

    } catch (error: any) {
        console.error('Quick Leave Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    // Toggle OFF logic
    try {
        const body = await request.json();
        const { team_member_name, date } = body;
        const targetDate = date || getISTDateString();

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Find existing leave to delete
        // We search by name + date roughly because getting ID again is annoying but safer.
        const { data: userData } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .ilike('full_name', team_member_name)
            .single();

        if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { error } = await supabaseAdmin
            .from('leaves')
            .delete()
            .eq('team_member_id', userData.id)
            .eq('leave_date', targetDate);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

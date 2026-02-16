import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { mapHubstaffNameToQA } from '@/lib/hubstaff-name-mapping';

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

        console.log(`[QuickLeave] Processing for: ${team_member_name} on ${targetDate}`);

        // 2. Resolve User ID
        // Try exact match first
        let { data: userData } = await supabaseAdmin
            .from('user_profiles')
            .select('id, team_id, full_name')
            .ilike('full_name', team_member_name)
            .maybeSingle();

        // If not found, try using the mapped name for Hubstaff -> QA
        if (!userData) {
            const mappedName = mapHubstaffNameToQA(team_member_name);
            console.log(`[QuickLeave] Exact match failed. Trying mapped name: '${mappedName}'`);

            if (mappedName !== team_member_name) {
                const { data: mappedUserData } = await supabaseAdmin
                    .from('user_profiles')
                    .select('id, team_id, full_name')
                    .ilike('full_name', mappedName)
                    .maybeSingle();

                userData = mappedUserData;
            }
        }

        // If still not found, search by first name (lenient fallback)
        if (!userData) {
            const firstName = team_member_name.split(' ')[0];
            console.log(`[QuickLeave] Mapped match failed. Trying first name: '${firstName}'`);

            // Check if multiple users have the same first name to avoid collisions
            const { data: potentialUsers } = await supabaseAdmin
                .from('user_profiles')
                .select('id, team_id, full_name')
                .ilike('full_name', `${firstName}%`)
                .limit(2);

            if (potentialUsers && potentialUsers.length === 1) {
                userData = potentialUsers[0];
            } else if (potentialUsers && potentialUsers.length > 1) {
                console.warn(`[QuickLeave] Ambiguous first name match for '${firstName}'. Found:`, potentialUsers.map(u => u.full_name));
            }
        }

        if (!userData) {
            console.error(`[QuickLeave] User '${team_member_name}' not found in user_profiles.`);
            return NextResponse.json({ error: `User '${team_member_name}' not found` }, { status: 404 });
        }

        console.log(`[QuickLeave] Resolved user: ${team_member_name} -> ${userData.full_name} (ID: ${userData.id})`);

        // 3. Upsert Logic:
        // Check if leave exists for this user on this date.
        const { data: existingLeave, error: leaveError } = await supabaseAdmin
            .from('leaves')
            .select('id, leave_type')
            .eq('team_member_id', userData.id)
            .eq('leave_date', targetDate)
            .maybeSingle();

        if (leaveError && leaveError.code !== 'PGRST116') {
            console.error('Error checking existing leave:', leaveError);
            return NextResponse.json({ error: 'Failed to check existing leave' }, { status: 500 });
        }

        let result;

        // 4. Toggle Logic
        // If the SAME leave type exists, delete it (Toggle Off)
        if (existingLeave && existingLeave.leave_type === leave_type) {
            console.log(`[QuickLeave] Toggling OFF leave ${leave_type} for ${userData.full_name}`);
            const { error: deleteError } = await supabaseAdmin
                .from('leaves')
                .delete()
                .eq('id', existingLeave.id);

            if (deleteError) throw deleteError;

            return NextResponse.json({
                message: `Leave removed for ${userData.full_name}`,
                action: 'removed',
                leave: null
            });
        }
        // If DIFFERENT leave type exists, Update it
        else if (existingLeave) {
            console.log(`[QuickLeave] Updating leave from ${existingLeave.leave_type} to ${leave_type}`);
            const { data, error: updateError } = await supabaseAdmin
                .from('leaves')
                .update({
                    leave_type,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingLeave.id)
                .select()
                .single();

            if (updateError) throw updateError;
            result = data;
        }
        // If NO leave exists, Insert new one
        else {
            console.log(`[QuickLeave] Creating new leave ${leave_type}`);
            const { data, error: insertError } = await supabaseAdmin
                .from('leaves')
                .insert([{
                    team_member_id: userData.id,
                    team_member_name: userData.full_name, // Use the profile name
                    leave_date: targetDate,
                    leave_type,
                    status: 'Approved',
                    team_id: team_id || userData.team_id
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            result = data;
        }

        return NextResponse.json({
            message: `Leave set to ${leave_type} for ${userData.full_name}`,
            action: 'updated',
            leave: result
        });

    } catch (error: any) {
        console.error('Quick Leave Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    // We can handle delete via POST toggle, or implement explicit DELETE if needed
    // For now, the POST toggle handles removal.
    return NextResponse.json({ message: 'Use POST to toggle leave status' }, { status: 405 });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendPCNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = cookies();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile if logged in
        let profile = null;
        if (user) {
            const { data: profileData } = await supabaseAdmin
                .from('user_profiles')
                .select('role, team_id')
                .eq('id', user.id)
                .single();
            profile = profileData;
        }

        const body = await request.json();
        const { ...taskData } = body;

        // Determine effective team_id
        const isSuperAdmin = (profile as any)?.role === 'super_admin';
        const canOverride = isSuperAdmin || isManagerMode;

        const effectiveTeamId = (canOverride && taskData.team_id) ? taskData.team_id : profile?.team_id;

        if (!effectiveTeamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        // Perform Insert using Admin Client (Bypass RLS)
        const { data, error } = await supabaseAdmin
            .from('tasks')
            .insert([{
                ...taskData,
                team_id: effectiveTeamId
            }])
            .select()
            .single();

        if (error) {
            console.error('[API Tasks Create] Insert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Trigger PC Notification if PC is assigned
        if (data && data.pc) {
            try {
                // Fetch PC email from global_pcs
                const { data: pcData } = await supabaseAdmin
                    .from('global_pcs')
                    .select('email')
                    .eq('name', data.pc)
                    .single();

                if (pcData?.email) {
                    console.log(`[API Tasks Create] Sending PC notification to ${data.pc} (${pcData.email})`);
                    // Use the shared notification service
                    await sendPCNotification({
                        type: 'created',
                        pcEmail: pcData.email,
                        pcName: data.pc,
                        projectName: data.project_name,
                        taskName: data.sub_phase || 'General Task',
                        assignee: data.assigned_to || 'Unassigned',
                        status: data.status,
                        priority: data.priority,
                        startDate: data.start_date,
                        endDate: data.end_date
                    });
                } else {
                    console.warn(`[API Tasks Create] No email found for PC: ${data.pc}. Notification skip.`);
                }
            } catch (err) {
                console.error('[API Tasks Create] Error preparing notification:', err);
            }
        }

        return NextResponse.json({ task: data }, { status: 201 });

    } catch (error: any) {
        console.error('[API Tasks Create] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

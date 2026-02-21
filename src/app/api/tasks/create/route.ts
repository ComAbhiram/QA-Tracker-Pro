import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendPCNotification } from '@/lib/notifications';
import { createInAppNotification } from '@/lib/in-app-notifications';

export const dynamic = 'force-dynamic';

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

        // Handle both single object and array of objects
        const tasksToCreate = Array.isArray(body) ? body : [body];

        if (tasksToCreate.length === 0) {
            return NextResponse.json({ error: 'No task data provided' }, { status: 400 });
        }

        // Determine effective team_id
        const isSuperAdmin = (profile as any)?.role === 'super_admin';
        const canOverride = isSuperAdmin || isManagerMode;
        const defaultTeamId = profile?.team_id;

        // Process each task to add team_id
        const formattedTasks = tasksToCreate.map((taskData: any) => {
            const effectiveTeamId = (canOverride && taskData.team_id) ? taskData.team_id : defaultTeamId;

            if (!effectiveTeamId) {
                throw new Error('Team ID is required for all tasks');
            }

            return {
                ...taskData,
                team_id: effectiveTeamId
            };
        });

        // Perform Bulk Insert using Admin Client (Bypass RLS)
        const { data, error } = await supabaseAdmin
            .from('tasks')
            .insert(formattedTasks)
            .select();

        if (error) {
            console.error('[API Tasks Create] Insert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Trigger PC Notification if PC is assigned (for each created task)
        // We do this asynchronously to not block the response
        (async () => {
            if (!data) return;

            for (const task of data) {
                if (task.pc) {
                    try {
                        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
                            console.error('[API Tasks Create] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in environment!');
                            continue;
                        }

                        // Fetch PC email (Case-insensitive)
                        // console.log(`[API Tasks Create] Looking up email for PC: "${task.pc}"`);
                        const { data: pcData, error: pcFetchError } = await supabaseAdmin
                            .from('global_pcs')
                            .select('email')
                            .ilike('name', task.pc)
                            .single();

                        if (pcData?.email) {
                            // console.log(`[API Tasks Create] Sending PC notification to ${task.pc} (${pcData.email})`);
                            await sendPCNotification({
                                type: 'created',
                                pcEmail: pcData.email,
                                pcName: task.pc,
                                projectName: task.project_name,
                                taskName: task.sub_phase || 'General Task',
                                assignee: task.assigned_to || 'Unassigned',
                                status: task.status,
                                priority: task.priority,
                                startDate: task.start_date,
                                endDate: task.end_date
                            });
                        }
                        // Always create in-app notification (regardless of email)
                        await createInAppNotification({
                            pcName: task.pc,
                            taskId: task.id,
                            projectName: task.project_name,
                            taskName: task.sub_phase || 'General Task',
                            action: 'created',
                        });
                    } catch (err) {
                        console.error('[API Tasks Create] Error preparing notification:', err);
                    }
                }
            }
        })();

        return NextResponse.json({ tasks: data }, { status: 201 });

    } catch (error: any) {
        console.error('[API Tasks Create] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

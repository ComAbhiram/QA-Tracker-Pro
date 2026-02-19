import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendPCNotification } from '@/lib/notifications';

export async function PUT(request: NextRequest) {
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
                    set(name: string, value: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value, ...options });
                        } catch (error) {
                            // Handle cookie setting errors
                        }
                    },
                    remove(name: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value: '', ...options });
                        } catch (error) {
                            // Handle cookie removal errors
                        }
                    },
                },
            }
        );

        // Get authenticated user from session OR check for manager mode header
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Check for manager mode via header (most reliable method)
        const managerModeHeader = request.headers.get('X-Manager-Mode');
        const managerSession = cookieStore.get('manager_session')?.value;
        const guestToken = cookieStore.get('guest_token')?.value;
        const isManagerMode = managerModeHeader === 'true' || managerSession === 'active' || guestToken === 'manager_access_token_2026';

        console.log('[API Update] Auth check:', {
            hasUser: !!user,
            managerModeHeader,
            managerSession,
            guestToken,
            isManagerMode,
            allCookies: Array.from(cookieStore.getAll()).map(c => c.name),
            allHeaders: Object.fromEntries(request.headers.entries())
        });

        if (!user && !isManagerMode) {
            console.error('[API Update] Auth error:', authError);
            return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Check Permissions
        // 1. Get User Role (skip if manager mode)
        let profile = null;
        if (user) {
            const { data: profileData } = await supabaseServer
                .from('user_profiles')
                .select('role, team_id')
                .eq('id', user.id)
                .single();
            profile = profileData;
        }

        // 2. Get Task details (to check ownership/team and for email notifications)
        const { data: task, error: taskError } = await supabaseServer
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (taskError || !task) {
            console.error('[API Update] Task fetch error:', taskError);
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Manager mode has full access
        if (isManagerMode) {
            // Proceed with update - manager mode can edit any task
        } else {
            // Regular user - check permissions
            const isSuperAdmin = profile?.role === 'super_admin';
            const isManager = profile?.role === 'manager';
            const isTeamOwner = profile?.team_id === task.team_id;

            // Allow super_admin, manager, or team owners to edit
            if (!isSuperAdmin && !isManager && !isTeamOwner) {
                return NextResponse.json({ error: 'Unauthorized to edit this task' }, { status: 403 });
            }
        }

        // Check if start_date or end_date changed
        const startDateChanged = updates.start_date !== undefined && updates.start_date !== task.start_date;
        const endDateChanged = updates.end_date !== undefined && updates.end_date !== task.end_date;

        // Perform Update using Admin Client (Bypass RLS)
        const { error: updateError } = await supabaseServer
            .from('tasks')
            .update(updates)
            .eq('id', id);

        if (updateError) {
            console.error('Update Error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Send email notification if date changed
        if (startDateChanged || endDateChanged) {
            try {
                // ... existing Resend logic ...
                // Fetch team name and assignee name separately
                let teamName = 'Unknown Team';
                const currentAssignee = updates.assigned_to !== undefined ? updates.assigned_to : task.assigned_to;
                const assigneeName = currentAssignee || 'Unassigned';

                if (task.team_id) {
                    const { data: teamData } = await supabaseServer
                        .from('teams')
                        .select('name')
                        .eq('id', task.team_id)
                        .single();
                    if (teamData) teamName = teamData.name;
                }

                const currentSubPhase = updates.sub_phase !== undefined ? updates.sub_phase : task.sub_phase;
                const currentStatus = updates.status !== undefined ? updates.status : task.status;
                const currentPriority = updates.priority !== undefined ? updates.priority : task.priority;

                const emailPayload = {
                    taskId: id,
                    taskName: currentSubPhase || 'N/A',
                    projectName: task.project_name,
                    assignee: assigneeName,
                    teamName: teamName,
                    dateField: startDateChanged ? 'start_date' : 'end_date',
                    oldDate: startDateChanged ? task.start_date : task.end_date,
                    newDate: startDateChanged ? updates.start_date : updates.end_date,
                    status: currentStatus,
                    priority: currentPriority,
                    phase: currentSubPhase,
                    pc: updates.pc || task.pc
                };

                const protocol = request.headers.get('x-forwarded-proto') || 'https';
                const host = request.headers.get('host') || 'qa-tracker-pro.vercel.app';
                const emailApiUrl = `${protocol}://${host}/api/send-date-change-email`;

                fetch(emailApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload)
                }).catch(e => console.error('[API Update] Resend fetch failed:', e));
            } catch (emailError) {
                console.error('[API Update] Error preparing Resend email:', emailError);
            }
        }

        // Trigger PC Notification whenever a task is saved and a PC is assigned
        const targetPC = updates.pc || task.pc;
        if (targetPC) {
            console.log(`[API Update] Task saved with PC: ${targetPC}. Sending notification...`);
            try {
                if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
                    console.error('[API Update] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in environment!');
                }

                // Fetch PC email (Case-insensitive)
                console.log(`[API Update] Looking up email for PC: "${targetPC}"`);
                const { data: pcData, error: pcFetchError } = await supabaseServer
                    .from('global_pcs')
                    .select('email')
                    .ilike('name', targetPC)
                    .single();

                if (pcFetchError) {
                    console.warn(`[API Update] PC email lookup error for "${targetPC}":`, pcFetchError.message);
                } else {
                    console.log(`[API Update] Lookup result for "${targetPC}":`, pcData);
                }

                if (pcData?.email) {
                    console.log(`[API Update] Triggering PC notification (SMTP) for ${targetPC} (${pcData.email})`);

                    // Calculate changes for the email
                    const changes: Record<string, { old: any, new: any }> = {};
                    const fieldsToTrack = [
                        'status', 'assigned_to', 'assigned_to2', 'pc',
                        'start_date', 'end_date', 'priority', 'sub_phase',
                        'project_name', 'bug_count', 'comments', 'current_updates'
                    ];

                    const normalize = (val: any) => {
                        if (val === null || val === undefined || val === '') return null;
                        // Normalize dates to just YYYY-MM-DD
                        if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
                        return String(val).trim();
                    };

                    fieldsToTrack.forEach(field => {
                        if (updates[field] !== undefined) {
                            const oldVal = normalize(task[field]);
                            const newVal = normalize(updates[field]);
                            if (oldVal !== newVal) {
                                changes[field] = {
                                    old: task[field],
                                    new: updates[field]
                                };
                            }
                        }
                    });

                    console.log(`[API Update] Detected changes:`, JSON.stringify(changes));

                    await sendPCNotification({
                        type: 'updated',
                        pcEmail: pcData.email,
                        pcName: targetPC,
                        projectName: task.project_name,
                        taskName: updates.sub_phase || task.sub_phase || 'General Task',
                        assignee: updates.assigned_to || task.assigned_to || 'Unassigned',
                        status: updates.status || task.status,
                        priority: updates.priority || task.priority,
                        startDate: updates.start_date || task.start_date,
                        endDate: updates.end_date || task.end_date,
                        changes: changes
                    });
                } else {
                    console.warn(`[API Update] No email found for PC: ${targetPC}. Notification skip.`);
                }
            } catch (err) {
                console.error('[API Update] Error preparing PC notification:', err);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

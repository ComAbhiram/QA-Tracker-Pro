import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
                // Fetch team name and assignee name separately
                let teamName = 'Unknown Team';
                // Determine assignee name (assigned_to stores the Name directly)
                // Check updates first (in case it was changed), then fall back to existing task data
                const currentAssignee = updates.assigned_to !== undefined
                    ? updates.assigned_to
                    : task.assigned_to;

                const assigneeName = currentAssignee || 'Unassigned';

                if (task.team_id) {
                    const { data: teamData } = await supabaseServer
                        .from('teams')
                        .select('name')
                        .eq('id', task.team_id)
                        .single();
                    if (teamData) teamName = teamData.name;
                }


                const emailPayload = {
                    taskId: id,
                    taskName: task.sub_phase || 'N/A',
                    projectName: task.project_name,
                    assignee: assigneeName,
                    teamName: teamName,
                    dateField: startDateChanged ? 'start_date' : 'end_date',
                    oldDate: startDateChanged ? task.start_date : task.end_date,
                    newDate: startDateChanged ? updates.start_date : updates.end_date,
                    status: updates.status || task.status,
                    priority: task.priority,
                    phase: task.sub_phase,
                    pc: task.pc
                };

                // Construct absolute URL for email API (required in serverless environment)
                const protocol = request.headers.get('x-forwarded-proto') || 'https';
                const host = request.headers.get('host') || 'qa-tracker-pro.vercel.app';
                const emailApiUrl = `${protocol}://${host}/api/send-date-change-email`;

                // Send email synchronously (await to ensure it completes in serverless environment)
                console.log('[API Update] Sending email notification to:', emailApiUrl);
                try {
                    const emailResponse = await fetch(emailApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(emailPayload)
                    });

                    if (emailResponse.ok) {
                        console.log('[API Update] Email notification sent successfully');
                    } else {
                        const errorData = await emailResponse.json();
                        console.error('[API Update] Email API error:', errorData);
                    }
                } catch (fetchError) {
                    console.error('[API Update] Failed to call email API:', fetchError);
                }
            } catch (emailError) {
                console.error('[API Update] Error preparing email:', emailError);
                // Don't fail the update if email fails
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

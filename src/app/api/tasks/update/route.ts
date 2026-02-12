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

        // Get authenticated user from session OR check for manager session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // Check for manager session (server-side set cookie)
        const managerSession = cookieStore.get('manager_session')?.value;
        const guestToken = cookieStore.get('guest_token')?.value;
        const isManagerMode = managerSession === 'active' || guestToken === 'manager_access_token_2026';

        console.log('[API Update] Auth check:', {
            hasUser: !!user,
            managerSession,
            guestToken,
            isManagerMode,
            allCookies: Array.from(cookieStore.getAll()).map(c => c.name)
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

        // 2. Get Task details (to check ownership/team)
        const { data: task } = await supabaseServer
            .from('tasks')
            .select('team_id')
            .eq('id', id)
            .single();

        if (!task) {
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

        // Perform Update using Admin Client (Bypass RLS)
        const { error: updateError } = await supabaseServer
            .from('tasks')
            .update(updates)
            .eq('id', id);

        if (updateError) {
            console.error('Update Error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

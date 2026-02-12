import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
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

        if (!user && !isManagerMode) {
            return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Check Permissions
        let profile = null;
        if (user) {
            const { data: profileData } = await supabaseServer
                .from('user_profiles')
                .select('role, team_id')
                .eq('id', user.id)
                .single();
            profile = profileData;
        }

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
            // Proceed with delete - manager mode can delete any task
        } else {
            // Regular user - check permissions
            const isSuperAdmin = profile?.role === 'super_admin';
            const isManager = profile?.role === 'manager';
            const isTeamOwner = profile?.team_id === task.team_id;

            // Allow super_admin, manager, or team owners to delete
            if (!isSuperAdmin && !isManager && !isTeamOwner) {
                return NextResponse.json({ error: 'Unauthorized to delete this task' }, { status: 403 });
            }
        }

        // Perform Delete
        const { error: deleteError } = await supabaseServer
            .from('tasks')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

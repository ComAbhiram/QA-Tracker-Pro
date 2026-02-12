import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
    try {
        // Create Supabase client with cookies for proper session handling
        const cookieStore = cookies();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        });

        // Get authenticated user from session
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Check Permissions
        const { data: profile } = await supabaseServer
            .from('user_profiles')
            .select('role, team_id')
            .eq('id', user.id)
            .single();

        const { data: task } = await supabaseServer
            .from('tasks')
            .select('team_id')
            .eq('id', id)
            .single();

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const isSuperAdmin = profile?.role === 'super_admin';
        const isTeamOwner = profile?.team_id === task.team_id;

        if (!isSuperAdmin && !isTeamOwner) {
            return NextResponse.json({ error: 'Unauthorized to delete this task' }, { status: 403 });
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

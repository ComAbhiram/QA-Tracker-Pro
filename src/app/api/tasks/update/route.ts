import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify User
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authClient = createClient(supabaseUrl, supabaseAnonKey);

        const { data: { user }, error: authError } = await authClient.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Check Permissions
        // 1. Get User Role
        const { data: profile } = await supabaseServer
            .from('user_profiles')
            .select('role, team_id')
            .eq('id', user.id)
            .single();

        // 2. Get Task details (to check ownership/team)
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
            return NextResponse.json({ error: 'Unauthorized to edit this task' }, { status: 403 });
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

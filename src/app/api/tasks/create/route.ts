import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile to check role
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role, team_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
        }

        const body = await request.json();
        const { ...taskData } = body;

        // Determine effective team_id
        const isSuperAdmin = (profile as any).role === 'super_admin';
        const effectiveTeamId = (isSuperAdmin && taskData.team_id) ? taskData.team_id : profile.team_id;

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

        return NextResponse.json({ task: data }, { status: 201 });

    } catch (error: any) {
        console.error('[API Tasks Create] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

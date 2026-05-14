import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
    try {
        const { data: profiles } = await supabaseServer
            .from('user_profiles')
            .select('*')
            .ilike('full_name', '%Ramees%');

        const { data: leaves } = await supabaseServer
            .from('leaves')
            .select('*')
            .ilike('team_member_name', '%Ramees%')
            .order('leave_date', { ascending: false });

        const { data: teams } = await supabaseServer
            .from('teams')
            .select('*');

        return NextResponse.json({
            profiles,
            leaves,
            teams
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

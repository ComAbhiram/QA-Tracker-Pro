import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
    const supabase = await supabaseServer();

    // Get current user to determine team_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch team members
    const { data: members, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
    const supabase = await supabaseServer();
    const { name } = await req.json();

    if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team_id
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

    if (!profile?.team_id) {
        return NextResponse.json({ error: 'User has no team' }, { status: 400 });
    }

    // Insert new member
    const { data, error } = await supabase
        .from('team_members')
        .insert({ team_id: profile.team_id, name: name.trim() })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            return NextResponse.json({ error: 'Member already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: data });
}

export async function DELETE(req: NextRequest) {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

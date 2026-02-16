import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('team_id');

        // precise authentication check can be added here if needed
        // For now, we rely on the implementation context that this is used for authorized task management

        let query = supabaseAdmin
            .from('projects')
            .select('id, name, team_id')
            .in('status', ['active', 'imported'])
            .order('name');

        const cookieStore = cookies();
        const isManager = cookieStore.get('manager_session')?.value || cookieStore.get('guest_token')?.value || request.headers.get('X-Manager-Mode') === 'true';

        // Filter by team if provided, but for Manager Mode we return ALL
        if (teamId && !isManager && teamId !== 'ba60298b-8635-4cca-bcd5-7e470fad60e6') {
            // Include projects for the specific team OR global projects (team_id is null)
            query = query.or(`team_id.eq.${teamId},team_id.is.null`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching projects:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        let projects = data || [];

        // Deduplicate by name for Managers to avoid clutter from previous multi-team imports
        if (isManager) {
            const seenNames = new Set();
            projects = projects.filter(p => {
                const lowerName = p.name.trim().toLowerCase();
                if (seenNames.has(lowerName)) return false;
                seenNames.add(lowerName);
                return true;
            });
        }

        return NextResponse.json({ projects });
    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, status, description, team_id, hubstaff_id } = body;

        // Check if already exists (globally or within team)
        const { data: existing } = await supabaseAdmin
            .from('projects')
            .select('id')
            .or(`name.eq.${name}${hubstaff_id ? `,hubstaff_id.eq.${hubstaff_id}` : ''}`)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Project already exists' }, { status: 409 });
        }

        // Use supabaseAdmin to bypass RLS
        const { data, error } = await supabaseAdmin
            .from('projects')
            .insert([{
                name,
                status,
                description,
                team_id,
                hubstaff_id
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ project: data });
    } catch (error) {
        console.error('Internal server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

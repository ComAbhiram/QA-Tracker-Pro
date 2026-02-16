import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teamIdParam = searchParams.get('team_id');
        // Handle "undefined" or "null" strings which might come from frontend
        const teamId = (teamIdParam && teamIdParam !== 'undefined' && teamIdParam !== 'null') ? teamIdParam : null;

        // precise authentication check can be added here if needed
        // For now, we rely on the implementation context that this is used for authorized task management

        let query = supabaseAdmin
            .from('projects')
            .select('*')
            // Removed .in('status') filter to allow On Hold projects to be seen for Import check and Dropdown
            .order('name');

        const cookieStore = cookies();
        const isManager = cookieStore.get('manager_session')?.value || cookieStore.get('guest_token')?.value || request.headers.get('X-Manager-Mode') === 'true';
        const isQATeamGlobal = teamId === 'ba60298b-8635-4cca-bcd5-7e470fad60e6';

        // Filter by team if provided, but for Manager Mode we return ALL
        if (teamId && !isManager && !isQATeamGlobal) {
            // Use .or with proper syntax explicitly on the chain
            // Query Logic: project.team_id == teamId OR project.team_id IS NULL
            query = query.or(`team_id.eq.${teamId},team_id.is.null`);
        } else if (!isManager && isQATeamGlobal) {
            // QA Team can see everything (or specific QA logic?)
            // For now, no filter = see all.
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching projects:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Merge with 'project_overview' (Imported/Active projects)
        // We want to include these because sometimes a project exists here but hasn't been synced to 'projects' yet.
        let overviewQuery = supabaseAdmin
            .from('project_overview')
            .select('id, project_name, team_id, project_type')
            .order('project_name', { ascending: true });

        if (teamId && !isManager && !isQATeamGlobal) {
            overviewQuery = overviewQuery.or(`team_id.eq.${teamId},team_id.is.null`);
        }

        const { data: overviewData } = await overviewQuery;

        let projects = data || [];

        // Strategy: Combine projects. If duplicates overlap by name, keep 'projects' table version
        const existingNames = new Set(projects.map((p: any) => p.name.trim().toLowerCase()));

        if (overviewData) {
            overviewData.forEach((ov: any) => {
                const normalizedName = ov.project_name?.trim().toLowerCase();

                // If not in projects table, ADD IT.
                if (normalizedName && !existingNames.has(normalizedName)) {
                    projects.push({
                        id: ov.id, // Note: ID formats might differ (int vs uuid)
                        name: ov.project_name,
                        team_id: ov.team_id,
                        status: 'Active',
                        description: 'Imported from Overview',
                        hubstaff_id: null
                    });
                    existingNames.add(normalizedName);
                }
            });
        }


        // Sort combined list
        projects.sort((a: any, b: any) => a.name.localeCompare(b.name));

        // CRITICAL FIX: Deduplicate by name for ALL users, not just managers
        // This prevents duplicate projects with same name but different team_ids from appearing
        const seenNames = new Set();
        projects = projects.filter(p => {
            const lowerName = p.name.trim().toLowerCase();
            if (seenNames.has(lowerName)) return false;
            seenNames.add(lowerName);
            return true;
        });

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

        // 1. Check if already exists in projects table
        const { data: existingProject } = await supabaseAdmin
            .from('projects')
            .select('id')
            .or(`name.eq.${name}${hubstaff_id ? `,hubstaff_id.eq.${hubstaff_id}` : ''}`)
            .maybeSingle();

        if (existingProject) {
            return NextResponse.json({ error: 'Project already exists in projects list' }, { status: 409 });
        }

        // 2. Check if already exists in project_overview table
        // REMOVED: The DB trigger now handles ON CONFLICT DO NOTHING, so we CAN (and MUST) insert into 'projects'
        // to ensure the project is actually linked to the current team in the 'projects' table.
        // Failing to insert here causes the "Ghost Project" issue where it exists in overview but not in the main list.

        /* 
        if (team_id) {
            const { data: existingOverview } = await supabaseAdmin
                .from('project_overview')
                .select('id')
                .eq('project_name', name)
                .eq('team_id', team_id)
                .maybeSingle();

            if (existingOverview) {
                console.log(`[Import] Project '${name}' already in project_overview. Skipping insert to avoid trigger error.`);
                return NextResponse.json({
                    project: existingOverview,
                    message: "Project already exists in overview. Synced."
                });
            }
        } 
        */

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

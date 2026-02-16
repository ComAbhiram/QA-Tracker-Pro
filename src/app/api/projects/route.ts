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
            .select('*')
            // Removed .in('status') filter to allow On Hold projects to be seen for Import check and Dropdown
            .order('name');

        const cookieStore = cookies();
        const isManager = cookieStore.get('manager_session')?.value || cookieStore.get('guest_token')?.value || request.headers.get('X-Manager-Mode') === 'true';

        // Filter by team if provided, but for Manager Mode we return ALL
        if (teamId && !isManager && teamId !== 'ba60298b-8635-4cca-bcd5-7e470fad60e6') {
            // Use .or with proper syntax explicitly on the chain
            // Query Logic: project.team_id == teamId OR project.team_id IS NULL
            query = query.or(`team_id.eq.${teamId},team_id.is.null`);
        } else if (!isManager && teamId === 'ba60298b-8635-4cca-bcd5-7e470fad60e6') {
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

        if (teamId && !isManager && teamId !== 'ba60298b-8635-4cca-bcd5-7e470fad60e6') {
            overviewQuery = overviewQuery.eq('team_id', teamId);
        }

        const { data: overviewData } = await overviewQuery;

        let projects = data || [];

        // Strategy: Combine projects. If duplicates overlap by name, keep 'projects' table version (it usually has more Task Tracker specific metadata like hubstaff_id matching)
        // But if 'project_overview' has a project NOT in 'projects', add it.

        const existingNames = new Set(projects.map((p: any) => p.name.trim().toLowerCase()));

        if (overviewData) {
            overviewData.forEach((ov: any) => {
                const normalizedName = ov.project_name?.trim().toLowerCase();
                if (normalizedName && !existingNames.has(normalizedName)) {
                    projects.push({
                        id: ov.id, // Note: ID formats might differ (int vs uuid), frontend should handle gracefully
                        name: ov.project_name,
                        team_id: ov.team_id,
                        status: 'Active', // Default for overview items
                        description: 'Imported from Overview',
                        hubstaff_id: null
                    });
                    existingNames.add(normalizedName);
                }
            });
        }

        // Sort combined list
        projects.sort((a: any, b: any) => a.name.localeCompare(b.name));

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

        // Check if already exists in projects table
        const { data: existingProject } = await supabaseAdmin
            .from('projects')
            .select('id')
            .or(`name.eq.${name}${hubstaff_id ? `,hubstaff_id.eq.${hubstaff_id}` : ''}`)
            .maybeSingle();

        if (existingProject) {
            return NextResponse.json({ error: 'Project already exists in projects list' }, { status: 409 });
        }

        // We DO NOT check project_overview here anymore.
        // Reason: A project might exist in project_overview (Imported from Hubstaff)
        // but NOT in the 'projects' table (used for Dropdowns).
        // Passing this check allows us to "sync" it to the projects table.




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

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

        // CRITICAL: Do NOT filter by team here - we need ALL projects for proper deduplication
        // Team filtering happens AFTER deduplication to ensure we show user's team version

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching projects:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        let projects = data || [];

        // Sort projects list
        projects.sort((a: any, b: any) => a.name.localeCompare(b.name));

        // CRITICAL FIX: Deduplicate by name, but PRIORITIZE user's team projects
        // If multiple teams have the same project, keep the user's team version
        const projectsByName = new Map<string, any[]>(); // Map<lowercaseName, project[]>

        // Group projects by name
        projects.forEach(p => {
            const lowerName = p.name.trim().toLowerCase();
            if (!projectsByName.has(lowerName)) {
                projectsByName.set(lowerName, []);
            }
            projectsByName.get(lowerName)!.push(p);
        });

        // For each name, pick the best project (user's team if available, otherwise first)
        projects = Array.from(projectsByName.values()).map(group => {
            if (group.length === 1) return group[0];

            // Multiple projects with same name - prefer user's team
            const userTeamProject = group.find(p => p.team_id === teamId);
            return userTeamProject || group[0];
        });

        // NOW filter by team AFTER deduplication
        // This ensures we show user's team projects + shared projects (team_id = null)
        if (teamId && !isManager && !isQATeamGlobal) {
            projects = projects.filter(p => p.team_id === teamId || p.team_id === null);
        } else if (isQATeamGlobal && !isManager) {
            // QA team sees all projects
            // No filtering needed
        } else if (!isManager) {
            // Non-manager, non-QA team users see only their team's projects
            projects = projects.filter(p => p.team_id === teamId || p.team_id === null);
        }
        // Managers see everything (no filter)

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

        // 1. Check if this team has already imported this project
        // CRITICAL FIX: Check by (hubstaff_id, team_id) to prevent same team from importing twice
        // But allow different teams to import the same Hubstaff project
        if (hubstaff_id && team_id) {
            const { data: existingProject } = await supabaseAdmin
                .from('projects')
                .select('id, name')
                .eq('hubstaff_id', hubstaff_id)
                .eq('team_id', team_id)
                .maybeSingle();

            if (existingProject) {
                return NextResponse.json({
                    error: `Project "${existingProject.name}" has already been imported by your team`
                }, { status: 409 });
            }
        } else if (name && team_id) {
            // Fallback: check by name if no hubstaff_id
            const { data: existingProject } = await supabaseAdmin
                .from('projects')
                .select('id')
                .eq('name', name)
                .eq('team_id', team_id)
                .maybeSingle();

            if (existingProject) {
                return NextResponse.json({
                    error: 'Project with this name already exists for your team'
                }, { status: 409 });
            }
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

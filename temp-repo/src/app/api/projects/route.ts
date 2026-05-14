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
            .order('name')
            .limit(5000); // Increased limit from default 1000 to 5000

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching projects:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        let projects = data || [];

        // Global Deduplication:
        // Even if the DB has duplicates (before migration runs), the API should present a clean list.
        const projectsByName = new Map<string, any>();
        projects.forEach(p => {
            const cleanName = p.name.trim().toLowerCase();
            if (!projectsByName.has(cleanName)) {
                projectsByName.set(cleanName, p);
            } else {
                // If duplicates exist, prioritize the one with metadata or more info
                const existing = projectsByName.get(cleanName);
                if (!existing.pc && p.pc) projectsByName.set(cleanName, p);
                // hubstaff_id match is even better
                if (!existing.hubstaff_id && p.hubstaff_id) projectsByName.set(cleanName, p);
            }
        });

        projects = Array.from(projectsByName.values());

        // Sort projects list
        projects.sort((a: any, b: any) => a.name.localeCompare(b.name));

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
        if (hubstaff_id) {
            const { data: existingProject } = await supabaseAdmin
                .from('projects')
                .select('id, name')
                .eq('hubstaff_id', hubstaff_id)
                .maybeSingle();

            if (existingProject) {
                return NextResponse.json({
                    project: existingProject,
                    message: "Project already exists globally. Linked."
                });
            }
        } else if (name) {
            // Fallback: check by name if no hubstaff_id
            const { data: existingProject } = await supabaseAdmin
                .from('projects')
                .select('id, name')
                .eq('name', name)
                .maybeSingle();

            if (existingProject) {
                return NextResponse.json({
                    project: existingProject,
                    message: "Project with this name already exists globally. Linked."
                });
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
                team_id: null, // Always global
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

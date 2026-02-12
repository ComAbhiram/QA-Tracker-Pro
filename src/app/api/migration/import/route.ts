import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamId, data } = body; // data contains { projects, tasks }

        if (!teamId) {
            return NextResponse.json({ error: 'Target Team ID is required' }, { status: 400 });
        }

        if (!data || (!data.projects && !data.tasks)) {
            return NextResponse.json({ error: 'No data to import' }, { status: 400 });
        }

        const projects = data.projects || [];
        const tasks = data.tasks || [];
        const results = {
            projectsCreated: 0,
            projectsSkipped: 0,
            tasksCreated: 0
        };

        // --- STEP 1: Import Projects ---
        // Strategy: Iterate and INSERT IF NOT EXISTS (by name)

        // First, get existing projects for target team to avoid duplicates
        const { data: existingProjects, error: fetchError } = await supabase
            .from('projects')
            .select('name')
            .eq('team_id', teamId);

        if (fetchError) throw fetchError;

        const existingNames = new Set(existingProjects?.map(p => p.name.toLowerCase()) || []);

        for (const project of projects) {
            const normalizedName = (project.name || '').trim();
            if (!normalizedName) continue;

            if (existingNames.has(normalizedName.toLowerCase())) {
                results.projectsSkipped++;
                continue;
            }

            // Prepare for insert
            const { id, team_id, created_at, ...rest } = project;
            const projectToInsert = {
                ...rest,
                name: normalizedName,
                team_id: teamId,
                status: project.status || 'active'
            };

            const { error: insertError } = await supabase
                .from('projects')
                .insert([projectToInsert]);

            if (insertError) {
                console.error(`Failed to insert project ${normalizedName}:`, insertError);
                // Continue with other projects
            } else {
                results.projectsCreated++;
                existingNames.add(normalizedName.toLowerCase()); // Add to set to prevent double insert if dupes in JSON
            }
        }

        // --- STEP 2: Import Tasks ---
        // Tasks are always imported as new copies
        if (tasks.length > 0) {
            const tasksToInsert = tasks.map((t: any) => {
                const { id, team_id, ...rest } = t;
                return {
                    ...rest,
                    team_id: teamId
                };
            });

            const { data: insertedTasks, error: taskError } = await supabase
                .from('tasks')
                .insert(tasksToInsert)
                .select('id');

            if (taskError) {
                throw new Error(`Task Import Failed: ${taskError.message}`);
            }
            results.tasksCreated = insertedTasks?.length || 0;
        }

        return NextResponse.json({
            message: 'Migration successful',
            details: results
        });

    } catch (error: any) {
        console.error('Migration Import Handler Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        // 1. Fetch Projects
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .eq('team_id', teamId);

        if (projectsError) {
            throw new Error(`Projects Export Failed: ${projectsError.message}`);
        }

        // 2. Fetch Tasks
        const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('team_id', teamId);

        if (tasksError) {
            throw new Error(`Tasks Export Failed: ${tasksError.message}`);
        }

        const exportData = {
            metadata: {
                teamId,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            },
            projects: projects || [],
            tasks: tasks || []
        };

        // Return as JSON file download
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="team_migration_${teamId}.json"`,
            },
        });

    } catch (error: any) {
        console.error('Export Handler Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

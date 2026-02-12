import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamId, tasks } = body;

        if (!teamId) {
            return NextResponse.json({ error: 'Target Team ID is required' }, { status: 400 });
        }

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({ error: 'No tasks to import' }, { status: 400 });
        }

        // Prepare tasks for insertion
        // 1. Remove 'id' to let DB generate new ones
        // 2. Set 'team_id' to the new target team
        // 3. Remove 'created_at' to set to now (optional, or keep original history? 
        //    Better to reset created_at or keep? Migration implies "moving history", 
        //    but duplicates usually get new timestamps. Let's keep original created_at if present just in case,
        //    but definitely override team_id and strip ID).

        const tasksToInsert = tasks.map((t: any) => {
            // Destructure to separate ID from rest
            const { id, team_id, ...rest } = t;

            return {
                ...rest,
                team_id: teamId, // Force new team ID
                // Optional: Sanitization of nulls or format checks could go here
                // Note: project_name is required.
            };
        });

        // Bulk Insert
        const { data, error } = await supabase
            .from('tasks')
            .insert(tasksToInsert)
            .select('id');

        if (error) {
            console.error('Import DB Error:', error);
            return NextResponse.json({ error: `DB Import Failed: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Import successful',
            count: data.length,
            ids: data.map(d => d.id)
        });

    } catch (error: any) {
        console.error('Import Handler Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

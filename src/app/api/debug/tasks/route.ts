import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Fetch all tasks
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('id, project_name, sub_phase, assigned_to, assigned_to2, start_date, end_date, status')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Filter for tasks that might be Aswathi's
        const aswathiTasks = tasks?.filter(t =>
            (t.assigned_to && t.assigned_to.toLowerCase().includes('aswathi')) ||
            (t.assigned_to2 && t.assigned_to2.toLowerCase().includes('aswathi'))
        ) || [];

        return NextResponse.json({
            totalTasks: tasks?.length || 0,
            aswathiTasks: aswathiTasks.length,
            sampleTasks: tasks?.slice(0, 5).map(t => ({
                project: t.project_name,
                phase: t.sub_phase,
                assigned: t.assigned_to,
                assigned2: t.assigned_to2,
                dates: `${t.start_date} to ${t.end_date}`,
                status: t.status
            })),
            aswathiTaskDetails: aswathiTasks.map(t => ({
                project: t.project_name,
                assigned: t.assigned_to,
                assigned2: t.assigned_to2,
                dates: `${t.start_date} to ${t.end_date}`
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

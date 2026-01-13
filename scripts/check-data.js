
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking projects table count...');
    const { count, error: countError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting projects:', countError);
    } else {
        console.log('Number of projects in Supabase:', count);
    }

    console.log('Checking distinct project names in tasks...');
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('project_name');

    if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
    } else {
        const uniqueProjects = [...new Set(tasks.map(t => t.project_name))];
        console.log('Number of unique projects in tasks (legacy):', uniqueProjects.length);
        console.log('Expected projects:', uniqueProjects.slice(0, 5));
    }
}

checkData();

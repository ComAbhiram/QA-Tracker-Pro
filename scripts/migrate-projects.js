
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateProjects() {
    console.log('Fetching unique project names from tasks...');
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('project_name');

    if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
    }

    const uniqueProjects = [...new Set(tasks.map(t => t.project_name))].filter(Boolean);
    console.log(`Found ${uniqueProjects.length} unique projects.`);

    console.log('Inserting into projects table...');
    const projectsToInsert = uniqueProjects.map(name => ({
        name: name,
        status: 'active',
        created_at: new Date().toISOString()
    }));

    // Insert in chunks to avoid request size limits if any
    const chunkSize = 50;
    for (let i = 0; i < projectsToInsert.length; i += chunkSize) {
        const chunk = projectsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
            .from('projects')
            .insert(chunk);

        if (insertError) {
            console.error('Error inserting chunk:', insertError);
        } else {
            console.log(`Inserted chunk ${i / chunkSize + 1}`);
        }
    }

    console.log('Migration complete.');
}

migrateProjects();

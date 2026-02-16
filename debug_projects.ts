
import { createClient } from '@supabase/supabase-js';

// Hardcoded for debugging context
const supabaseUrl = 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc4NDEwNCwiZXhwIjoyMDY5MzYwMTA0fQ.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProjects() {
    console.log('Checking projects...');

    // 1. Check Projects Table for "Talent" or "TALEN"
    const { data: projects, error: pError } = await supabase
        .from('projects')
        .select('*')
        .ilike('name', '%talen%');

    if (pError) console.error('Error fetching projects:', pError);
    else {
        console.log('Found in [projects] table:', projects?.length);
        projects?.forEach(p => console.log(` - Limit ID: ${p.id}, Name: "${p.name}", Team: ${p.team_id}`));
    }

    // 2. Check Project Overview for "Talent" or "TALEN"
    const { data: overview, error: oError } = await supabase
        .from('project_overview')
        .select('*')
        .ilike('project_name', '%talen%');

    if (oError) console.error('Error fetching overview:', oError);
    else {
        console.log('Found in [project_overview] table:', overview?.length);
        overview?.forEach(p => console.log(` - ID: ${p.id}, Name: "${p.project_name}", Team: ${p.team_id}`));
    }
}

checkProjects();

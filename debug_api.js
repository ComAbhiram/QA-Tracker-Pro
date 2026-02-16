
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xazvjdnszawrdlcmsbus.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhenZqZG5zemF3cmRsY21zYnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQxMDQsImV4cCI6MjA2OTM2MDEwNH0.Qy4FdNeJ-pK3Ubc2FU2G5L_aYH5DGHa3mVfbY5u0dfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    console.log('--- DEBUG USER TEAM ---');
    // Get a user to find team_id
    const { data: user } = await supabase.from('user_profiles').select('*').limit(1).single();
    if (!user) { console.log("No user found"); return; }

    const teamId = user.team_id;
    console.log(`Testing with Team ID: ${teamId} (User: ${user.full_name})`);

    console.log('\n--- SIMULATE GET /api/projects ---');

    // 1. Projects Table
    let query = supabase
        .from('projects')
        .select('*')
        .order('name');

    // Logic from Route: .or(`team_id.eq.${teamId},team_id.is.null`)
    // But supabase-js .or syntax: .or('team_id.eq.X,team_id.is.null')
    query = query.or(`team_id.eq.${teamId},team_id.is.null`);

    const { data: projects } = await query;
    console.log(`Projects found in DB (Count: ${projects.length})`);
    const talentProj = projects.find(p => p.name.toLowerCase().includes('talent'));
    console.log('Is "Talent" in projects table?', talentProj || 'No');


    // 2. Overview Table
    let overviewQuery = supabase
        .from('project_overview')
        .select('id, project_name, team_id, project_type')
        .eq('team_id', teamId)
        .order('project_name');

    const { data: overview } = await overviewQuery;
    console.log(`Overview found (Count: ${overview.length})`);

    const talentOv = overview.find(o => o.project_name.toLowerCase().includes('talent'));
    console.log('Is "Talent" in project_overview?', talentOv || 'No');

    // 3. Simulate Merge
    const combined = [...projects];
    const existingNames = new Set(combined.map(p => p.name.trim().toLowerCase()));

    overview.forEach(ov => {
        const normalizedName = ov.project_name?.trim().toLowerCase();
        if (normalizedName && !existingNames.has(normalizedName)) {
            console.log(`[MERGE] Adding ${ov.project_name} from Overview`);
            combined.push(ov);
        } else {
            if (ov.project_name.toLowerCase().includes('talent')) {
                console.log(`[MERGE] Skipping "Talent" because it thinks it exists? Normalized: "${normalizedName}"`);
                console.log('Existing Set has it?', existingNames.has(normalizedName));
            }
        }
    });

    console.log('\nFinal List has Talent?', combined.find(p => (p.name || p.project_name).toLowerCase().includes('talent')) ? 'Yes' : 'No');
}

debug();


const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAndCreateTeams() {
    // 1. Fetch existing teams
    const { data: teams, error } = await supabase.from('teams').select('id, name');
    if (error) {
        console.error('Error fetching teams:', error);
        return;
    }

    const teamNames = ['Dubai', 'Cochin'];
    const teamMap = {};

    // 2. Check and Create
    for (const name of teamNames) {
        const existing = teams.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            teamMap[name] = existing.id;
            console.log(`Found ${name}: ${existing.id}`);
        } else {
            const { data: newTeam, error: createError } = await supabase
                .from('teams')
                .insert({ name })
                .select()
                .single();

            if (createError) {
                console.error(`Error creating ${name}:`, createError);
            } else {
                teamMap[name] = newTeam.id;
                console.log(`Created ${name}: ${newTeam.id}`);
            }
        }
    }

    console.log('Final Team Map:', JSON.stringify(teamMap, null, 2));
}

fetchAndCreateTeams();

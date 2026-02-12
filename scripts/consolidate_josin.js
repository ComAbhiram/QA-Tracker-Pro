
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Use service role key if available for administrative updates, otherwise anon might be RLS restricted
// Check if SERVICE_ROLE_KEY exists in env, else try anon
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function consolidateJosin() {
    console.log('Starting consolidation of "Josin" -> "Josin Joseph"...');

    // 1. Update tasks table (assigned_to)
    const { data: tasks1, error: err1 } = await supabase
        .from('tasks')
        .update({ assigned_to: 'Josin Joseph' })
        .eq('assigned_to', 'Josin')
        .select();

    if (err1) console.error('Error updating tasks.assigned_to:', err1);
    else console.log(`Updated ${tasks1.length} tasks in assigned_to.`);

    // 2. Update tasks table (assigned_to2)
    const { data: tasks2, error: err2 } = await supabase
        .from('tasks')
        .update({ assigned_to2: 'Josin Joseph' })
        .eq('assigned_to2', 'Josin')
        .select();

    if (err2) console.error('Error updating tasks.assigned_to2:', err2);
    else console.log(`Updated ${tasks2.length} tasks in assigned_to2.`);

    // 3. Update team_members table
    // Check if "Josin" exists
    const { data: member, error: memberErr } = await supabase
        .from('team_members')
        .select('*')
        .eq('name', 'Josin')
        .single();

    if (member) {
        // Check if "Josin Joseph" already exists
        const { data: existingTarget } = await supabase
            .from('team_members')
            .select('*')
            .eq('name', 'Josin Joseph')
            .single();

        if (existingTarget) {
            // If both exist, delete "Josin" (duplicate)
            console.log('Both "Josin" and "Josin Joseph" exist in team_members. Deleting "Josin"...');
            const { error: delErr } = await supabase
                .from('team_members')
                .delete()
                .eq('id', member.id);
            if (delErr) console.error('Error deleting "Josin" member:', delErr);
            else console.log('Deleted "Josin" member.');
        } else {
            // Rename "Josin" to "Josin Joseph"
            console.log('Renaming "Josin" to "Josin Joseph" in team_members...');
            const { error: updateErr } = await supabase
                .from('team_members')
                .update({ name: 'Josin Joseph' })
                .eq('id', member.id);
            if (updateErr) console.error('Error renaming member:', updateErr);
            else console.log('Renamed member.');
        }
    } else {
        console.log('"Josin" not found in team_members.');
    }
}

consolidateJosin();

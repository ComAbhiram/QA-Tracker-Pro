import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLeaveTeamIds() {
    console.log('Starting to fix leave team_id assignments...\n');

    // Step 1: Get all team members with their correct team_ids
    const { data: members, error: membersError } = await supabase
        .from('user_profiles')
        .select('id, full_name, team_id');

    if (membersError) {
        console.error('Error fetching members:', membersError);
        return;
    }

    console.log(`Found ${members?.length} team members\n`);

    // Step 2: Get all leaves
    const { data: leaves, error: leavesError } = await supabase
        .from('leaves')
        .select('*');

    if (leavesError) {
        console.error('Error fetching leaves:', leavesError);
        return;
    }

    console.log(`Found ${leaves?.length} leave records\n`);

    // Step 3: Match leaves to members and fix team_id
    let fixedCount = 0;
    let errors = 0;

    for (const leave of leaves || []) {
        // Find the member by matching team_member_id or team_member_name
        const member = members?.find(m =>
            m.id === leave.team_member_id ||
            m.full_name === leave.team_member_name
        );

        if (member && member.team_id !== leave.team_id) {
            console.log(`Fixing: ${leave.team_member_name} - Leave team_id: ${leave.team_id?.substring(0, 8)}... → Member team_id: ${member.team_id?.substring(0, 8)}...`);

            const { error: updateError } = await supabase
                .from('leaves')
                .update({ team_id: member.team_id })
                .eq('id', leave.id);

            if (updateError) {
                console.error(`  ❌ Error updating leave ${leave.id}:`, updateError.message);
                errors++;
            } else {
                console.log(`  ✅ Updated successfully`);
                fixedCount++;
            }
        }
    }

    console.log(`\n✅ Fixed ${fixedCount} leave records`);
    if (errors > 0) {
        console.log(`❌ ${errors} errors occurred`);
    }
}

fixLeaveTeamIds().catch(console.error);

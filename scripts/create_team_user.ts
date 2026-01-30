
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local');
    console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file to run this script.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const NEW_USER_EMAIL = 'vishal@intersmart.in';
const NEW_USER_PASSWORD = 'Vishalhere12@';
const NEW_TEAM_NAME = 'Frontend developers';

async function main() {
    console.log('Starting Team and User Creation...');

    try {
        // 1. Check or Create Team
        console.log(`Checking for team: ${NEW_TEAM_NAME}...`);
        let teamId: string | null = null;

        const { data: existingTeams, error: teamSearchError } = await supabase
            .from('teams')
            .select('id')
            .eq('name', NEW_TEAM_NAME)
            .single();

        if (teamSearchError && teamSearchError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
            console.error('Error checking team:', teamSearchError);
            throw teamSearchError;
        }

        if (existingTeams) {
            console.log(`Team "${NEW_TEAM_NAME}" already exists with ID: ${existingTeams.id}`);
            teamId = existingTeams.id;
        } else {
            console.log(`Creating team "${NEW_TEAM_NAME}"...`);
            const { data: newTeam, error: createTeamError } = await supabase
                .from('teams')
                .insert({ name: NEW_TEAM_NAME })
                .select('id')
                .single();

            if (createTeamError) {
                console.error('Error creating team:', createTeamError);
                throw createTeamError;
            }
            console.log(`Team created with ID: ${newTeam.id}`);
            teamId = newTeam.id;
        }

        // 2. Create User
        console.log(`Creating user: ${NEW_USER_EMAIL}...`);
        // Check if user exists first to avoid error? createAdminUser handles duplicates nicely usually or throws
        const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
            email: NEW_USER_EMAIL,
            password: NEW_USER_PASSWORD,
            email_confirm: true // Auto confirm
        });

        if (createUserError) {
            console.error('Error creating user:', createUserError);
            throw createUserError;
        }

        const userId = userData.user.id;
        console.log(`User created/retrieved with ID: ${userId}`);

        // 3. Create User Profile
        console.log('Linking user to team in user_profiles...');

        // Upsert profile
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
                id: userId,
                email: NEW_USER_EMAIL,
                full_name: 'Vishal', // Default name
                role: 'member',
                team_id: teamId
            });

        if (profileError) {
            console.error('Error creating/updating user profile:', profileError);
            throw profileError;
        }

        console.log('SUCCESS: Team and User created and linked successfully.');

    } catch (error) {
        console.error('SCRIPT FAILED:', error);
        process.exit(1);
    }
}

main();

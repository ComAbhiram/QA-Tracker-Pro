const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const USERS_TO_CREATE = [
    {
        email: 'romine@intersmart.in',
        password: 'Rominehere12@',
        teamId: '1b7f4bec-85e0-4672-8995-2833a318e0f8',
        name: 'Romine',
        teamName: 'Designers'
    },
    {
        email: 'manu@intersmart.in',
        password: 'Manuhere12@',
        teamId: '97a4a945-dd8f-483e-8504-2c5f6026907a',
        name: 'Manu',
        teamName: 'PHP'
    },
    {
        email: 'saneesh@intersmart.in',
        password: 'Sanhere12@',
        teamId: 'a1792a59-c963-4cbf-a517-768b7b07c313',
        name: 'Saneesh',
        teamName: 'Mobile App'
    }
];

async function main() {
    console.log('Starting Batch User Creation...');

    for (const user of USERS_TO_CREATE) {
        try {
            console.log(`\nProcessing user: ${user.email} for team: ${user.teamName}...`);

            let userId = null;

            // 1. Create User
            const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true // Auto confirm
            });

            if (createUserError) {
                console.log(`User creation returned error: ${createUserError.message}`);
                // Check if user already exists
                const { data: users, error: listError } = await supabase.auth.admin.listUsers();
                if (listError) throw listError;

                const existingUser = users.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());

                if (existingUser) {
                    console.log(`User already exists with ID: ${existingUser.id}`);
                    userId = existingUser.id;
                } else {
                    console.error(`Failed to create user ${user.email} and could not find existing user.`);
                    throw createUserError;
                }
            } else {
                userId = userData.user.id;
                console.log(`User created with ID: ${userId}`);
            }

            if (!userId) {
                console.error(`Skipping ${user.email} - could not determine User ID`);
                continue;
            }

            // 2. Create User Profile
            console.log(`Linking user to team ${user.teamName} (${user.teamId})...`);

            const { error: profileError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: userId,
                    email: user.email,
                    full_name: user.name,
                    role: 'member',
                    team_id: user.teamId
                });

            if (profileError) {
                console.error('Error creating/updating user profile:', profileError);
                throw profileError;
            }

            console.log(`SUCCESS: User ${user.email} linked to ${user.teamName} successfully.`);

        } catch (error) {
            console.error(`FAILED to process ${user.email}:`, error);
        }
    }

    console.log('\nBatch processing complete.');
}

main();

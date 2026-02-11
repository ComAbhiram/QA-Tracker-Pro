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

const NEW_USER_EMAIL = 'amruthalakshmi@intersmart.in';
const NEW_USER_PASSWORD = 'Amruthahere12@';
const TEAM_ID = 'ae7a28e0-dc96-4b59-937a-0b4be0fd9334'; // Wordpress Team

async function main() {
    console.log('Starting User Creation...');

    try {
        // 1. Create User
        console.log(`Creating user: ${NEW_USER_EMAIL}...`);

        // Check if user exists?
        // Supposedly admin.createUser handles this (returns error if exists, usually).
        // If it exists, we might just want to get the ID.

        let userId = null;

        // Try to fetch user by email first to avoid error if they exist but aren't in team
        // Actually, admin.listUsers or just try create and catch error.

        const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
            email: NEW_USER_EMAIL,
            password: NEW_USER_PASSWORD,
            email_confirm: true // Auto confirm
        });

        if (createUserError) {
            console.log('User creation returned error:', createUserError.message);
            // If user already exists, we need their ID.
            // We can use admin.listUsers() to find them by email.
            const { data: users, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) throw listError;
            const existingUser = users.users.find(u => u.email === NEW_USER_EMAIL);
            if (existingUser) {
                console.log(`User already exists with ID: ${existingUser.id}`);
                userId = existingUser.id;
            } else {
                throw createUserError;
            }
        } else {
            userId = userData.user.id;
            console.log(`User created with ID: ${userId}`);
        }

        if (!userId) {
            throw new Error('Could not get User ID');
        }

        // 2. Create User Profile
        console.log('Linking user to team in user_profiles...');

        // Upsert profile
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
                id: userId,
                email: NEW_USER_EMAIL,
                full_name: 'Amrutha Lakshmi', // Default name based on email
                role: 'member',
                team_id: TEAM_ID
            });

        if (profileError) {
            console.error('Error creating/updating user profile:', profileError);
            throw profileError;
        }

        console.log('SUCCESS: User created/updated and linked to Wordpress Team successfully.');

    } catch (error) {
        console.error('SCRIPT FAILED:', error);
        process.exit(1);
    }
}

main();

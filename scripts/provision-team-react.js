const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try to load env vars from .env, .env.local, etc.
const envPaths = ['.env.local', '.env'];
for (const envPath of envPaths) {
    if (fs.existsSync(path.resolve(process.cwd(), envPath))) {
        dotenv.config({ path: path.resolve(process.cwd(), envPath) });
        break;
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('CRITICAL: Missing Supabase environment variables! Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createTeamReact() {
    const teamName = 'Team React';
    const adminEmail = 'Saneesh@intersmart.in';
    const adminPassword = 'Saneesh12@';

    console.log(`Starting creation of team: ${teamName}...`);

    try {
        // 1. Check if team already exists
        const { data: existingTeam } = await supabaseAdmin
            .from('teams')
            .select('id')
            .ilike('name', teamName)
            .maybeSingle();

        let teamId;

        if (existingTeam) {
            console.log(`Team "${teamName}" already exists (ID: ${existingTeam.id}).`);
            teamId = existingTeam.id;
        } else {
            // 2. Create team
            const { data: team, error: teamError } = await supabaseAdmin
                .from('teams')
                .insert({ name: teamName })
                .select()
                .single();

            if (teamError) throw teamError;
            console.log(`Team "${teamName}" created successfully (ID: ${team.id}).`);
            teamId = team.id;
        }

        // 3. Create user account
        console.log(`Creating user: ${adminEmail}...`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`User ${adminEmail} already exists. Attempting to link to team...`);
                // Get the user ID if they exist
                const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
                const user = userData.users.find(u => u.email === adminEmail);
                if (user) {
                    await linkProfile(user.id, adminEmail, teamId);
                }
            } else {
                throw authError;
            }
        } else {
            console.log(`User ${adminEmail} created in Auth.`);
            await linkProfile(authData.user.id, adminEmail, teamId);
        }

        console.log('SUCCESS: Team React and Admin User setup complete.');

    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
}

async function linkProfile(userId, email, teamId) {
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
            id: userId,
            email: email,
            team_id: teamId,
            role: 'admin',
            full_name: 'Saneesh'
        }, { onConflict: 'id' });

    if (profileError) {
        console.error('Error linking/updating profile:', profileError);
        throw profileError;
    }
    console.log(`User profile for ${email} linked to team successfully.`);
}

createTeamReact();

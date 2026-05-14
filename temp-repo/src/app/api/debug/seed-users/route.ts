
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Users to create based on tracker screenshot and "Missing" status
const USERS_TO_SEED = [
    { name: 'Josin Joseph', email: 'josin@intersmart.in', team: 'Frontend Developers' },
    { name: 'Abish', email: 'abish@intersmart.in', team: 'Frontend Developers' },
    { name: 'Ajay', email: 'ajay@intersmart.in', team: 'Frontend Developers' },
    { name: 'Samir Mulashiya', email: 'samir@intersmart.in', team: 'Frontend Developers' },
    { name: 'Sreegith VA', email: 'sreegith@intersmart.in', team: 'Frontend Developers' }
];

// Default Team ID for Frontend Developers (fallback)
const DEFAULT_TEAM_ID = 'frontend_team_id_placeholder';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get a valid team ID to link to (try to find "Frontend Developers" or distinct team_id from existing users)
        const { data: existingUser } = await supabaseAdmin
            .from('user_profiles')
            .select('team_id')
            .not('team_id', 'is', null)
            .limit(1)
            .single();

        const validTeamId = existingUser?.team_id || DEFAULT_TEAM_ID;

        const results = [];

        for (const user of USERS_TO_SEED) {
            console.log(`Processing ${user.name}...`);

            // Check if user profile already exists by name
            const { data: existingProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('id')
                .ilike('full_name', user.name)
                .maybeSingle();

            if (existingProfile) {
                results.push({ name: user.name, status: 'Already Exists', id: existingProfile.id });
                continue;
            }

            // Create Auth User
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: user.email,
                password: 'TempPassword123!', // Temporary password
                email_confirm: true,
                user_metadata: { full_name: user.name }
            });

            if (authError) {
                // If auth user exists but profile doesn't, we might need to find the auth user ID
                console.error(`Auth error for ${user.name}:`, authError.message);

                // Try to find the user by email if "User already registered"
                if (authError.message.includes('already registered')) {
                    // logic to fetch ID could go here, but for now just log it
                    results.push({ name: user.name, status: 'Auth User Exists (Profile Missing?)', error: authError.message });
                } else {
                    results.push({ name: user.name, status: 'Auth Failed', error: authError.message });
                }
                continue;
            }

            const userId = authData.user.id;

            // Create Profile
            const { error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .insert([{
                    id: userId,
                    email: user.email,
                    full_name: user.name,
                    role: 'member',
                    team_id: validTeamId
                }]);

            if (profileError) {
                results.push({ name: user.name, status: 'Profile Creation Failed', error: profileError.message });
            } else {
                results.push({ name: user.name, status: 'Created', id: userId });
            }
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

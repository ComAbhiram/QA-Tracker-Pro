
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const USER_EMAIL = 'vishal@intersmart.in';
const USER_PASSWORD = 'Vishalhere12@';

async function testProjectCreation() {
    console.log('--- Testing Project Creation as ' + USER_EMAIL + ' ---');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Sign In
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: USER_EMAIL,
        password: USER_PASSWORD,
    });

    if (authError || !authData.user) {
        console.error('Login failed:', authError);
        return;
    }
    console.log('Logged in. User ID:', authData.user.id);

    // 2. Get Team ID
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('team_id')
        .eq('id', authData.user.id)
        .single();

    if (profileError) {
        console.error('Failed to fetch profile:', profileError);
        return;
    }
    console.log('User Team ID:', profile.team_id);

    if (!profile.team_id) {
        console.error('CRITICAL: User has no team_id! Creation will likely fail if RLS requires it.');
    }

    // 3. Try to Create Project (Manual style)
    const testProjectName = 'Test Project ' + Date.now();
    console.log(`Attempting to insert project "${testProjectName}" with team_id: ${profile.team_id}...`);

    // Explicitly check session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Active Session User ID:', session?.user.id);

    const { data, error: insertError } = await supabase
        .from('projects')
        .insert([{
            name: testProjectName,
            status: 'active',
            description: 'Automated test project',
            hubstaff_id: 12345, // Simulate Hubstaff ID being passed
            team_id: profile.team_id
        }])
        .select();

    if (insertError) {
        console.error('INSERT FAILED:', insertError);
        console.log('Possible causes: RLS policy denies INSERT, or team_id mismatch.');
    } else {
        console.log('INSERT SUCCESS:', data);

        // Clean up
        console.log('Cleaning up test project...');
        const { error: deleteError } = await supabase.from('projects').delete().eq('id', data[0].id);
        if (deleteError) console.error('Delete failed:', deleteError);
        else console.log('Cleanup successful.');
    }
}

testProjectCreation();

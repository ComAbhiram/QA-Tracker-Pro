import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET /api/teams - List all teams with their admin emails
export async function GET() {
    try {
        // Fetch teams and their admin profiles
        const { data: teams, error: teamsError } = await supabaseServer
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });

        if (teamsError) throw teamsError;

        // Fetch admin emails from user_profiles - fetch all users for these teams
        const { data: profiles, error: profilesError } = await supabaseServer
            .from('user_profiles')
            .select('team_id, email, role');

        if (profilesError) throw profilesError;

        // Merge profiles into teams
        const teamsWithEmails = teams.map(team => {
            // Priority: team_admin > any other role
            const teamProfiles = profiles.filter(p => p.team_id === team.id);
            const adminProfile = teamProfiles.find(p => p.role === 'team_admin') || teamProfiles[0];
            
            return {
                ...team,
                adminEmail: adminProfile?.email || null
            };
        });

        return NextResponse.json({ teams: teamsWithEmails });
    } catch (error: any) {
        console.error('Error fetching teams:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch teams' },
            { status: 500 }
        );
    }
}

// POST /api/teams - Create new team with admin user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamName, adminEmail, adminPassword } = body;

        if (!teamName || !adminEmail || !adminPassword) {
            return NextResponse.json(
                { error: 'Team name, admin email, and password are required' },
                { status: 400 }
            );
        }

        // Create admin client for user creation
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Create team
        const { data: team, error: teamError } = await supabaseServer
            .from('teams')
            .insert({ name: teamName })
            .select()
            .single();

        if (teamError) throw teamError;

        // 2. Resolve User ID
        let userId: string | null = null;
        let createdNewAuthUser = false;

        // A. Check if a profile already exists for this email (most direct way to get ID)
        const { data: existingProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .ilike('email', adminEmail.trim())
            .maybeSingle();

        if (existingProfile) {
            userId = existingProfile.id;
        } else {
            // B. If no profile, try creating the Auth user
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: adminEmail,
                password: adminPassword,
                email_confirm: true
            });

            if (authError) {
                // C. If creation fails because they already exist in Auth
                if (authError.message.toLowerCase().includes('already registered') ||
                    authError.message.toLowerCase().includes('already exists') ||
                    authError.status === 422) {

                    // Fetch existing user ID from Auth list
                    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                    const searchEmail = adminEmail.trim().toLowerCase();
                    const existingUser = usersData?.users.find(u => u.email?.toLowerCase() === searchEmail);

                    if (existingUser) {
                        userId = existingUser.id;
                        // Update password for existing user so it matches what was typed in the form
                        await supabaseAdmin.auth.admin.updateUserById(userId, { password: adminPassword });
                        console.log(`[TeamsAPI] Updated password for linked user ${adminEmail}`);
                    } else {
                        // Rollback and fail if we still can't find them
                        await supabaseServer.from('teams').delete().eq('id', team.id);
                        throw new Error(`User ${adminEmail} is registered in Auth but profile is missing and ID couldn't be resolved.`);
                    }
                } else {
                    // Other auth error - rollback and fail
                    await supabaseServer.from('teams').delete().eq('id', team.id);
                    throw authError;
                }
            } else {
                userId = authData.user.id;
                createdNewAuthUser = true;
            }
        }

        if (!userId) {
            await supabaseServer.from('teams').delete().eq('id', team.id);
            throw new Error('Failed to resolve User ID for admin account.');
        }

        // 3. Create or Update user profile linked to team
        const { error: profileError } = await supabaseServer
            .from('user_profiles')
            .upsert({
                id: userId,
                email: adminEmail.trim().toLowerCase(),
                team_id: team.id,
                role: 'team_admin',
                full_name: 'Admin' // Default name if new
            }, { onConflict: 'id' });

        if (profileError) {
            // Rollback team creation (don't delete user if they were already there)
            if (createdNewAuthUser) {
                await supabaseAdmin.auth.admin.deleteUser(userId);
            }
            await supabaseServer.from('teams').delete().eq('id', team.id);
            throw profileError;
        }

        return NextResponse.json({
            success: true,
            team,
            message: `Team "${teamName}" created successfully with admin ${adminEmail}`
        });

    } catch (error: any) {
        console.error('Error creating team:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create team' },
            { status: 500 }
        );
    }
}

// PATCH /api/teams - Update team and admin details
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { teamId, teamName, adminEmail, adminPassword } = body;

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: { autoRefreshToken: false, persistSession: false }
            }
        );

        // 1. Update Team Name if provided
        if (teamName) {
            const { error: teamError } = await supabaseAdmin
                .from('teams')
                .update({ name: teamName })
                .eq('id', teamId);
            
            if (teamError) throw teamError;
        }

        // 2. Resolve Admin User ID from user_profiles
        // 2. Resolve the user to update (Priority: team_admin > any team user)
        let { data: profile, error: profileFetchError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, role')
            .eq('team_id', teamId)
            .eq('role', 'team_admin')
            .maybeSingle();

        if (profileFetchError) throw profileFetchError;

        // If no team_admin, just pick the first user associated with this team
        if (!profile) {
            const { data: anyUser } = await supabaseAdmin
                .from('user_profiles')
                .select('id, email, role')
                .eq('team_id', teamId)
                .limit(1)
                .maybeSingle();
            
            profile = anyUser;
        }

        // 2. Resolve the target email to update
        const targetEmail = adminEmail?.trim().toLowerCase();

        // 3. Handle User Update/Linking
        if (targetEmail || adminPassword) {
            try {
                // A. Check if a user with this email already exists in Auth
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (listError) throw listError;
                
                const existingUser = targetEmail ? users.find(u => u.email?.toLowerCase() === targetEmail) : null;

                if (existingUser) {
                    // Scenario 1: User already exists - Link them to the team
                    console.log(`[PATCH Teams] Linking existing user ${targetEmail} to team ${teamId}`);
                    
                    const { error: profileError } = await supabaseAdmin
                        .from('user_profiles')
                        .upsert({
                            id: existingUser.id,
                            email: targetEmail,
                            team_id: teamId,
                            role: 'team_admin'
                        }, { onConflict: 'id' });
                    
                    if (profileError) throw profileError;

                    // Update password if provided
                    if (adminPassword) {
                        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: adminPassword });
                        if (authError) throw authError;
                    }
                } else if (targetEmail) {
                    // Scenario 2: Email doesn't exist - Try to update the CURRENT team user's email
                    // First, find who is currently linked to the team
                    const { data: currentProfile } = await supabaseAdmin
                        .from('user_profiles')
                        .select('id')
                        .eq('team_id', teamId)
                        .limit(1)
                        .maybeSingle();

                    if (currentProfile) {
                        console.log(`[PATCH Teams] Renaming current user ${currentProfile.id} to ${targetEmail}`);
                        
                        const updateData: any = { email: targetEmail };
                        if (adminPassword) updateData.password = adminPassword;

                        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(currentProfile.id, updateData);
                        if (authError) throw authError;

                        const { error: profileUpdateError } = await supabaseAdmin
                            .from('user_profiles')
                            .update({ email: targetEmail })
                            .eq('id', currentProfile.id);
                        
                        if (profileUpdateError) throw profileUpdateError;
                    } else {
                        // Scenario 3: No user linked to team yet - We can't really "update", user should use "Create Team" or we can create a user here?
                        // For now, let's just return an error that a user profile wasn't found to update.
                        throw new Error('No user profile found for this team. Please create a new team or manually link a user.');
                    }
                } else if (adminPassword) {
                    // Scenario 4: Only password update requested for current user
                    const { data: currentProfile } = await supabaseAdmin
                        .from('user_profiles')
                        .select('id')
                        .eq('team_id', teamId)
                        .limit(1)
                        .maybeSingle();

                    if (currentProfile) {
                        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(currentProfile.id, { password: adminPassword });
                        if (authError) throw authError;
                    }
                }
            } catch (err: any) {
                console.error('[PATCH Teams] Auth/Profile update error:', err);
                throw err;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Team updated successfully'
        });

    } catch (error: any) {
        console.error('Error updating team:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update team' },
            { status: 500 }
        );
    }
}

// DELETE /api/teams/:id - Delete team
export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const teamId = url.searchParams.get('id');

        if (!teamId) {
            return NextResponse.json(
                { error: 'Team ID is required' },
                { status: 400 }
            );
        }

        // Create admin client for robust deletion
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Clear team_id from user_profiles to avoid FK constraint errors
        await supabaseAdmin
            .from('user_profiles')
            .update({ team_id: null })
            .eq('team_id', teamId);

        // 2. Clear team_id from projects
        await supabaseAdmin
            .from('projects')
            .update({ team_id: null })
            .eq('team_id', teamId);

        // 3. Delete team (cascade might handle others, but let's be safe)
        const { error } = await supabaseAdmin
            .from('teams')
            .delete()
            .eq('id', teamId);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Team deleted successfully'
        });

    } catch (error: any) {
        console.error('Error deleting team:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete team' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

// GET /api/teams - List all teams
export async function GET() {
    try {
        const { data: teams, error } = await supabaseServer
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ teams });
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

        // 2. Create or Get user account
        let userId: string;
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                // User already exists, fetch their ID
                const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (listError) {
                    await supabaseServer.from('teams').delete().eq('id', team.id);
                    throw listError;
                }
                const searchEmail = adminEmail.trim().toLowerCase();
                const existingUser = usersData.users.find(u => u.email?.toLowerCase() === searchEmail);
                if (!existingUser) {
                    await supabaseServer.from('teams').delete().eq('id', team.id);
                    throw new Error(`User with email ${adminEmail} reported as registered but not found in list. Please check the email case.`);
                }
                userId = existingUser.id;
                console.log(`[TeamsAPI] Linking existing user ${adminEmail} (ID: ${userId}) to new team ${teamName}`);
            } else {
                // Rollback team creation for other errors
                await supabaseServer.from('teams').delete().eq('id', team.id);
                throw authError;
            }
        } else {
            userId = authData.user.id;
        }

        // 3. Create or Update user profile linked to team (Upsert)
        const { error: profileError } = await supabaseServer
            .from('user_profiles')
            .upsert({
                id: userId,
                email: adminEmail,
                team_id: team.id,
                role: 'admin'
            }, { onConflict: 'id' });

        if (profileError) {
            // Rollback team creation (don't delete user if they already existed)
            if (!authError) {
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

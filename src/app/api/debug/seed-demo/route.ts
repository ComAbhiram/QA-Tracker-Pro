import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const results: Record<string, any> = {};

        // ── 1. Create the demo team ──────────────────────────────────────────
        const teamName = 'Demo Team';
        let teamId: string;

        const { data: existingTeam } = await supabaseAdmin
            .from('teams')
            .select('id')
            .eq('name', teamName)
            .maybeSingle();

        if (existingTeam) {
            teamId = existingTeam.id;
            results.team = { status: 'Already exists', id: teamId, name: teamName };
        } else {
            const { data: newTeam, error: teamError } = await supabaseAdmin
                .from('teams')
                .insert({ name: teamName })
                .select('id')
                .single();

            if (teamError) {
                return NextResponse.json({ error: `Team creation failed: ${teamError.message}` }, { status: 500 });
            }
            teamId = newTeam.id;
            results.team = { status: 'Created', id: teamId, name: teamName };
        }

        // ── 2. Create accounts ────────────────────────────────
        const accounts = [
            { email: 'admin@example.com', password: 'admin123', name: 'Super Admin', role: 'super_admin' },
            { email: 'user@example.com', password: 'user123', name: 'Demo User', role: 'member' }
        ];

        for (const acc of accounts) {
            let userId: string;

            // Try to create auth user
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: acc.email,
                password: acc.password,
                email_confirm: true,
                user_metadata: { full_name: acc.name },
            });

            if (authError) {
                if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
                    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
                    const existing = users?.users?.find((u) => u.email === acc.email);
                    if (existing) {
                        userId = existing.id;
                        await supabaseAdmin.auth.admin.updateUserById(userId, { password: acc.password });
                        results[acc.email] = { auth: 'Already exists (password updated)', id: userId };
                    } else {
                        results[acc.email] = { error: 'Auth user exists but could not be found.' };
                        continue;
                    }
                } else {
                    results[acc.email] = { error: `Auth creation failed: ${authError.message}` };
                    continue;
                }
            } else {
                userId = authData.user.id;
                results[acc.email] = { auth: 'Created', id: userId };
            }

            // ── 3. Upsert user_profile ───────────────────────────────────────────
            const { error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .upsert({
                    id: userId,
                    email: acc.email,
                    full_name: acc.name,
                    role: acc.role,
                    team_id: teamId,
                }, { onConflict: 'id' });

            if (profileError) {
                results[acc.email].profile = { status: 'Failed', error: profileError.message };
            } else {
                results[acc.email].profile = { status: 'Upserted', role: acc.role, team_id: teamId };
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Demo accounts ready!',
            results,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

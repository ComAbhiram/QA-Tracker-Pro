import { supabase } from '@/lib/supabase';

export async function getCurrentUserTeam() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(`
            team_id, 
            role,
            teams (
                id,
                name
            )
        `)
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        console.error('Error fetching user team:', error);
        return null;
    }

    // QA Team ID fallback for super_admins who don't have a team_id assigned
    const QA_TEAM_ID = 'ba60298b-8635-4cca-bcd5-7e470fad60e6';
    const resolvedTeamId = profile.team_id || (profile.role === 'super_admin' ? QA_TEAM_ID : null);

    return {
        team_id: resolvedTeamId,
        role: profile.role,
        team_name: (profile.teams as any)?.name || (profile.role === 'super_admin' ? 'QA Team' : 'Team')
    };
}

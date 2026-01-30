import { supabase } from '@/lib/supabase';

export async function getCurrentUserTeam() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('team_id, role')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        console.error('Error fetching user team:', error);
        return null;
    }

    return profile;
}

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Team {
    id: string;
    name: string;
}

export function useTeams(isGuest: boolean) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!isGuest) {
            setTeams([]);
            return;
        }

        const fetchTeams = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('teams')
                    .select('id, name')
                    .order('name');

                if (error) throw error;

                if (data) {
                    const filteredTeams = data.filter(team =>
                        !['cochin', 'dubai'].includes(team.name.toLowerCase())
                    );
                    setTeams(filteredTeams);
                }
            } catch (err: any) {
                console.error('Error fetching teams:', err);
                setError(err instanceof Error ? err : new Error(err.message || 'Failed to fetch teams'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeams();
    }, [isGuest]);

    return { teams, isLoading, error };
}

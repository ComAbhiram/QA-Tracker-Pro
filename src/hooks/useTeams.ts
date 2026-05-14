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
                console.log('[useTeams] Fetching teams for isGuest:', isGuest);
                const { data, error } = await supabase
                    .from('teams')
                    .select('id, name');

                if (error) throw error;

                if (data) {
                    const filteredTeams = data.filter(team =>
                        !['cochin', 'dubai'].includes(team.name.toLowerCase())
                    );

                    // Custom Sorting Order
                    const sortOrder = [
                        'designers',
                        'html',
                        'php team',
                        'wordpress',
                        'team react',
                        'qa team',
                        'server',
                        'pmo'
                    ];

                    const sortedTeams = filteredTeams.sort((a, b) => {
                        const nameA = a.name.toLowerCase();
                        const nameB = b.name.toLowerCase();
                        
                        const indexA = sortOrder.indexOf(nameA);
                        const indexB = sortOrder.indexOf(nameB);

                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                        
                        return nameA.localeCompare(nameB);
                    });

                    console.log('[useTeams] Teams fetched and sorted:', sortedTeams.length);
                    setTeams(sortedTeams);
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

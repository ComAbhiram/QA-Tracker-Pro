'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestMode } from '@/contexts/GuestContext';
import { Users, Loader2 } from 'lucide-react';

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Team {
    id: string;
    name: string;
    created_at: string;
}

export default function GuestTeamSelectionPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { setGuestSession } = useGuestMode();
    const router = useRouter();

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const response = await fetch('/api/teams');
            const data = await response.json();

            if (data.teams) {
                setTeams(data.teams);
            } else {
                throw new Error('No teams found');
            }
        } catch (err: any) {
            console.error('Error fetching teams:', err);
            setError(err.message || 'Failed to load teams');
        } finally {
            setLoading(false);
        }
    };

    const handleTeamSelect = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        console.log('Selected Team:', team);
        let targetTeamId = team.id;
        const targetTeamName = team.name;

        // If 'QA Team' is selected, find 'Super Admin' team ID and use that instead
        if (targetTeamName.toLowerCase() === 'qa team') {
            const superAdminTeam = teams.find(t => t.name.toLowerCase() === 'super admin');
            if (superAdminTeam) {
                targetTeamId = superAdminTeam.id;
                console.log('Mapping QA Team to Super Admin ID:', targetTeamId);
            } else {
                console.warn('Super Admin team not found, using original QA Team ID');
            }
        }

        console.log('Setting Guest Session:', { targetTeamId, targetTeamName });
        setGuestSession(targetTeamId, targetTeamName);
        router.push('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-2xl bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 md:p-12 border border-white/50">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition-transform duration-300">
                        <Users className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Select a Team</h1>
                    <p className="text-slate-500 text-lg font-medium">Choose which team's dashboard you'd like to view</p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center mb-8">
                        <p className="font-medium">{error}</p>
                        <button
                            onClick={fetchTeams}
                            className="mt-3 text-sm text-red-600 hover:text-red-800 underline font-semibold"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Teams Dropdown */}
                {!loading && !error && (
                    <div className="w-full max-w-md mx-auto space-y-6">
                        <Select onValueChange={handleTeamSelect}>
                            <SelectTrigger className="w-full h-16 text-lg px-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 shadow-sm hover:shadow-md data-[state=open]:border-indigo-500 data-[state=open]:ring-4 data-[state=open]:ring-indigo-500/10">
                                <SelectValue placeholder="Select a team..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-2 border-slate-100 shadow-xl max-h-[400px] bg-white">
                                <SelectGroup className="p-2">
                                    <SelectLabel className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Available Teams</SelectLabel>
                                    {teams.map((team) => (
                                        <SelectItem
                                            key={team.id}
                                            value={team.id}
                                            className="rounded-xl px-4 py-3 text-base font-medium cursor-pointer focus:bg-indigo-50 focus:text-indigo-700 outline-none my-1 transition-colors"
                                        >
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>

                        <div className="text-center pt-8 border-t border-slate-100 mt-8">
                            <button
                                onClick={() => router.push('/login')}
                                className="text-slate-500 hover:text-indigo-600 font-semibold transition-colors flex items-center justify-center gap-2 mx-auto group"
                            >
                                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Login
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

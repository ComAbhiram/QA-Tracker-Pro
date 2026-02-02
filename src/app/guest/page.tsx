'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestMode } from '@/contexts/GuestContext';
import { Users, ArrowRight, Loader2 } from 'lucide-react';

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

    const handleTeamSelect = (team: Team) => {
        setGuestSession(team.id, team.name);
        router.push('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Users className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">Select a Team</h1>
                    <p className="text-slate-600 text-lg">Choose which team's dashboard you'd like to view</p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center">
                        <p className="font-medium">{error}</p>
                        <button
                            onClick={fetchTeams}
                            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Teams Grid */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => handleTeamSelect(team)}
                                className="group bg-white hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 border-2 border-slate-200 hover:border-indigo-400 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-xl text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:from-indigo-200 group-hover:to-purple-200 w-14 h-14 rounded-xl flex items-center justify-center transition-all">
                                            <Users className="text-indigo-600" size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                                {team.name}
                                            </h3>
                                            <p className="text-sm text-slate-500">View team dashboard</p>
                                        </div>
                                    </div>
                                    <ArrowRight
                                        className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"
                                        size={24}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Back to Login */}
                <div className="text-center mt-8">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-slate-600 hover:text-indigo-600 font-medium transition-colors"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestMode } from '@/contexts/GuestContext';
import { Users, ArrowRight } from 'lucide-react';
import Loader from '@/components/ui/Loader';

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

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getGradientClass = (name: string, index: number) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('admin') || lowerName.includes('super')) {
            return 'from-amber-500 to-orange-600 shadow-amber-500/20';
        }
        if (lowerName.includes('qa') || lowerName.includes('test')) {
            return 'from-indigo-500 to-purple-600 shadow-indigo-500/20';
        }
        if (lowerName.includes('dev') || lowerName.includes('tech')) {
            return 'from-emerald-500 to-teal-600 shadow-emerald-500/20';
        }
        
        const gradients = [
            'from-indigo-500 to-blue-600 shadow-indigo-500/20',
            'from-emerald-500 to-teal-600 shadow-emerald-500/20',
            'from-pink-500 to-rose-600 shadow-pink-500/20',
            'from-cyan-500 to-blue-500 shadow-cyan-500/20',
            'from-violet-500 to-purple-600 shadow-violet-500/20'
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 md:p-10 bg-mesh-gradient relative overflow-hidden">
            {/* Ambient Animated Mesh Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[120px] animate-orb-1 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-500/5 rounded-full blur-[140px] animate-orb-2 pointer-events-none" />

            <div className="w-full max-w-4xl glass-card-premium rounded-3xl shadow-2xl p-8 md:p-12 border border-slate-800/80 backdrop-blur-2xl relative z-10 animate-in fade-in duration-500">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/5 transform hover:scale-105 transition-transform duration-300">
                        <Users className="text-amber-500 animate-pulse" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">Select a Team</h1>
                    <p className="text-slate-400 text-lg font-medium">Choose which team's dashboard you'd like to explore in guest mode</p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader size="md" />
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-center mb-8 max-w-md mx-auto">
                        <p className="font-semibold">{error}</p>
                        <button
                            onClick={fetchTeams}
                            className="mt-3 text-sm text-amber-500 hover:text-amber-400 underline font-bold transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Teams Grid selection */}
                {!loading && !error && (
                    <div className="space-y-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {teams.map((team, index) => {
                                const initials = getInitials(team.name);
                                const gradient = getGradientClass(team.name, index);
                                return (
                                    <div
                                        key={team.id}
                                        onClick={() => handleTeamSelect(team.id)}
                                        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] flex flex-col justify-between h-44"
                                    >
                                        {/* Colorful premium stripe */}
                                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradient.split(' shadow')[0]}`} />
                                        
                                        <div className="flex items-start justify-between">
                                            {/* Beautiful Monogram Avatar */}
                                            <div className={`bg-gradient-to-br ${gradient} w-14 h-14 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg tracking-wider transform group-hover:scale-105 transition-all duration-300`}>
                                                {initials}
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-800/80 px-3.5 py-1.5 rounded-full group-hover:text-amber-400 group-hover:bg-amber-500/10 border border-slate-800 group-hover:border-amber-500/20 transition-all duration-300">
                                                Access
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-end justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                                                    {team.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-semibold mt-1">
                                                    View live status & performance
                                                </p>
                                            </div>
                                            
                                            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-800 text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-500/10 group-hover:border-amber-500/20 transition-all duration-300 transform group-hover:translate-x-1.5">
                                                <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center pt-8 border-t border-slate-800/60 mt-8">
                            <button
                                onClick={() => router.push('/login')}
                                className="text-slate-400 hover:text-amber-400 font-bold transition-all duration-300 flex items-center justify-center gap-2 mx-auto group text-base"
                            >
                                <span className="group-hover:-translate-x-1.5 transition-transform duration-300">←</span> Back to Login
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

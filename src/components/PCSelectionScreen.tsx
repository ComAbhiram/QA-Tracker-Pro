'use client';

import { useEffect, useState } from 'react';
import { useGuestMode } from '@/contexts/GuestContext';
import { UserCircle, Monitor, ShieldCheck, Loader2 } from 'lucide-react';
import Loader from '@/components/ui/Loader';

interface PC {
    id: number;
    name: string;
}

export default function PCSelectionScreen() {
    const { setPCSelection } = useGuestMode();
    const [pcs, setPcs] = useState<PC[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPCs() {
            try {
                const res = await fetch('/api/pcs');
                if (res.ok) {
                    const data = await res.json();
                    setPcs(data.pcs || []);
                }
            } catch (err) {
                console.error('Error fetching PCs:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchPCs();
    }, []);

    const handleSelectPC = (pcName: string) => {
        setPCSelection(pcName);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 z-[100] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">Loading PCs...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 z-[100] overflow-y-auto">
            <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col justify-center">

                {/* Header Section */}
                <div className="text-center mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
                    <div className="inline-flex items-center justify-center p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                        <Monitor className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                        Select Your PC Role
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Welcome to PC Mode. Please select your designated PC account below to view your personalized dashboard securely.
                    </p>
                </div>

                {/* PC Avatar Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150 fill-mode-both">
                    {pcs.map((pc, index) => (
                        <button
                            key={pc.id || pc.name}
                            onClick={() => handleSelectPC(pc.name)}
                            className="group relative flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-emerald-500 scale-50 group-hover:scale-100">
                                <ShieldCheck className="w-6 h-6" />
                            </div>

                            {/* Avatar Circle Generator */}
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white shadow-inner transition-transform duration-300 group-hover:scale-110 
                                ${index % 5 === 0 ? 'bg-gradient-to-br from-blue-400 to-indigo-500' :
                                    index % 5 === 1 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                                        index % 5 === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                                            index % 5 === 3 ? 'bg-gradient-to-br from-pink-400 to-rose-500' :
                                                'bg-gradient-to-br from-purple-400 to-fuchsia-500'}`}
                            >
                                {pc.name.substring(0, 2).toUpperCase()}
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate w-full text-center">
                                {pc.name}
                            </h3>
                            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 group-hover:bg-emerald-500 transition-colors duration-300"></div>
                        </button>
                    ))}

                    {/* Fallback Empty State */}
                    {pcs.length === 0 && !loading && (
                        <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                            <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No PC records found in the database.</p>
                        </div>
                    )}
                </div>

                <div className="mt-16 text-center text-sm text-slate-500 dark:text-slate-500 animate-in fade-in duration-1000 delay-500 fill-mode-both">
                    <p>Secured via Team Tracker PC Access Protocol</p>
                </div>
            </div>
        </div>
    );
}

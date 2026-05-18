"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useGuestMode } from '@/contexts/GuestContext';
import { Lock, Mail, LayoutDashboard, Users, X, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Loader from '@/components/ui/Loader';
import CloseButton from '@/components/ui/CloseButton';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [managerPassword, setManagerPassword] = useState('');
    const [showPCModal, setShowPCModal] = useState(false);
    const [pcPassword, setPCPassword] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session) {
                router.push('/');
                // Keep loading true while redirecting
            } else {
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            
            let message = err.message || 'Failed to login';
            
            // Handle the specific "Unexpected token 'I'" parsing error which occurs 
            // when the proxy returns an "Internal Server Error" string.
            if (message.includes('Unexpected token') || message.includes('JSON')) {
                message = 'Server configuration error. Please check your Supabase URL and keys in .env.local and restart the server.';
            }
            
            setError(message);
            setLoading(false);
        }
    };

    const { setGuestSession, setPCModeSession } = useGuestMode(); // Import hook at top level

    const handleManagerLogin = async () => {
        if (managerPassword === 'intersmart') {
            try {
                // Call server-side API to set manager session
                let response;
                try {
                    response = await fetch('/api/auth/manager-login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ passkey: managerPassword }),
                    });
                } catch (fetchErr) {
                    setError('Connection error. Please check if the server is running.');
                    return;
                }

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errData = await response.json();
                        setError(errData.message || 'Failed to authenticate manager');
                    } else {
                        setError(`Server error (${response.status}). Please check your connection or environment variables.`);
                    }
                    return;
                }

                // Auto-select "QA Team" logic
                try {
                    const teamsResponse = await fetch('/api/teams');
                    if (!teamsResponse.ok) {
                        throw new Error(`Teams API failed with status ${teamsResponse.status}`);
                    }
                    
                    const contentType = teamsResponse.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        const rawText = await teamsResponse.text();
                        console.error('Invalid JSON from /api/teams:', rawText.substring(0, 100));
                        throw new Error('Server returned invalid data format instead of JSON');
                    }

                    const teamsData = await teamsResponse.json();

                    if (teamsData.teams && Array.isArray(teamsData.teams)) {
                        const teams: any[] = teamsData.teams;
                        const qaTeam = teams.find(t => t.name.toLowerCase() === 'qa team');

                        if (qaTeam) {
                            let targetTeamId = qaTeam.id;
                            let targetTeamName = qaTeam.name;

                            // Check for 'Super Admin' mapping if 'QA Team' is selected
                            // This logic mirrors guest/page.tsx
                            if (targetTeamName.toLowerCase() === 'qa team') {
                                const superAdminTeam = teams.find(t => t.name.toLowerCase() === 'super admin');
                                if (superAdminTeam) {
                                    targetTeamId = superAdminTeam.id;
                                    console.log('Manager Login: Mapping QA Team to Super Admin ID');
                                }
                            }

                            setGuestSession(targetTeamId, targetTeamName);
                            setShowManagerModal(false);
                            setManagerPassword('');
                            router.push('/');
                            return;
                        }
                    }
                } catch (teamErr: any) {
                    console.error('Failed to auto-fetch teams for manager:', teamErr);
                    // Fallback to guest selection page if auto-select fails
                }

                setShowManagerModal(false);
                setManagerPassword('');
                router.push('/guest');
            } catch (err: any) {
                console.error('Manager login error:', err);
                setError(err.message || 'Failed to authenticate manager');
            }
        } else {
            setError('Invalid manager passkey');
        }
    };

    const handlePCLogin = async () => {
        if (pcPassword === 'inter224') {
            try {
                let response;
                try {
                    response = await fetch('/api/auth/pc-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ passkey: pcPassword }),
                    });
                } catch (fetchErr) {
                    setError('Connection error. Please check if the server is running.');
                    return;
                }

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errData = await response.json();
                        setError(errData.message || 'Failed to authenticate PC mode');
                    } else {
                        setError(`Server error (${response.status}). Please check your connection or environment variables.`);
                    }
                    return;
                }

                // Auto-select "QA Team" same as manager mode
                try {
                    const teamsResponse = await fetch('/api/teams');
                    if (!teamsResponse.ok) {
                        throw new Error(`Teams API failed with status ${teamsResponse.status}`);
                    }

                    const contentType = teamsResponse.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        throw new Error('Server returned invalid data format instead of JSON');
                    }

                    const teamsData = await teamsResponse.json();

                    if (teamsData.teams && Array.isArray(teamsData.teams)) {
                        const teams: any[] = teamsData.teams;
                        const qaTeam = teams.find(t => t.name.toLowerCase() === 'qa team');

                        if (qaTeam) {
                            let targetTeamId = qaTeam.id;
                            let targetTeamName = qaTeam.name;

                            if (targetTeamName.toLowerCase() === 'qa team') {
                                const superAdminTeam = teams.find(t => t.name.toLowerCase() === 'super admin');
                                if (superAdminTeam) {
                                    targetTeamId = superAdminTeam.id;
                                }
                            }

                            setPCModeSession(targetTeamId, targetTeamName);
                            setShowPCModal(false);
                            setPCPassword('');
                            router.push('/');
                            return;
                        }
                    }
                } catch (teamErr: any) {
                    console.error('Failed to auto-fetch teams for PC mode:', teamErr);
                }

                setShowPCModal(false);
                setPCPassword('');
                router.push('/guest');
            } catch (err: any) {
                console.error('PC login error:', err);
                setError(err.message || 'Failed to authenticate PC mode');
            }
        } else {
            setError('Invalid PC mode passkey');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 md:p-10 bg-mesh-gradient relative overflow-hidden">
            {/* Ambient Animated Mesh Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[120px] animate-orb-1 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-500/5 rounded-full blur-[140px] animate-orb-2 pointer-events-none" />

            {/* Manager Password Modal */}
            {showManagerModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="glass-card-premium border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
                        <CloseButton
                            onClick={() => {
                                setShowManagerModal(false);
                                setManagerPassword('');
                                setError(null);
                            }}
                            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
                        />

                        <div className="text-center mb-6 pt-2">
                            <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-700/20 border border-indigo-500/30 w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                                <Users className="text-indigo-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Manager Access</h2>
                            <p className="text-slate-400 text-sm">Enter the secure passkey to retrieve team data.</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-xl font-medium text-center">
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={managerPassword}
                                    onChange={(e) => setManagerPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleManagerLogin()}
                                    placeholder="Enter passkey"
                                    autoFocus
                                    className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600 font-medium glow-input-indigo"
                                />
                            </div>

                            <button
                                onClick={handleManagerLogin}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PC Mode Password Modal */}
            {showPCModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="glass-card-premium border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
                        <CloseButton
                            onClick={() => {
                                setShowPCModal(false);
                                setPCPassword('');
                                setError(null);
                            }}
                            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
                        />

                        <div className="text-center mb-6 pt-2">
                            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/30 w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                                <Lock className="text-emerald-400" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">PC Mode Access</h2>
                            <p className="text-slate-400 text-sm">Read-only access to view all team data.</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-xl font-medium text-center">
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={pcPassword}
                                    onChange={(e) => setPCPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handlePCLogin()}
                                    placeholder="Enter passkey"
                                    autoFocus
                                    className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-white placeholder:text-slate-600 font-medium glow-input-emerald"
                                />
                            </div>

                            <button
                                onClick={handlePCLogin}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Split Card (Glassmorphic Premium) */}
            <div className="w-full max-w-sm sm:max-w-md md:max-w-4xl glass-card-premium border border-white/10 rounded-[32px] shadow-2xl overflow-hidden grid md:grid-cols-2 min-h-[500px] md:min-h-[600px] mx-auto z-10">

                {/* Left Column: Form Section */}
                <div className="flex flex-col justify-center p-8 sm:p-10 md:p-14 h-full relative">
                    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">

                        {/* Header */}
                        <div className="text-center md:text-left space-y-2">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
                                    <LayoutDashboard className="text-slate-950 w-5 h-5" />
                                </div>
                                <span className="font-bold text-lg tracking-tight text-white">Team Tracker</span>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome back</h1>
                            <p className="text-sm text-slate-400">
                                Enter your email below to login to your account
                            </p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && !showManagerModal && (
                                <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-medium rounded-xl flex items-center justify-center text-center">
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300" htmlFor="email">
                                    Email
                                </label>
                                <div className="relative">
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-sm text-white placeholder:text-slate-600 focus-visible:outline-none outline-none transition-all glow-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-300" htmlFor="password">
                                        Password
                                    </label>
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-sm text-white placeholder:text-slate-600 focus-visible:outline-none outline-none transition-all glow-input"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all h-11 px-4 py-2 w-full bg-amber-500 text-slate-950 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {loading && <Loader size="xs" color="black" />}
                                    <span>Sign In</span>
                                </span>
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-slate-800/80">
                            <span className="relative z-10 bg-slate-900 px-3 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                Or continue with
                            </span>
                        </div>

                        {/* Actions Row */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Manager Login Trigger */}
                            <button
                                type="button"
                                onClick={() => { setShowManagerModal(true); setError(null); }}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-bold transition-all h-11 px-3 border border-slate-850 bg-slate-950/30 hover:bg-slate-950 text-slate-300 hover:text-white"
                            >
                                <Users className="mr-2 h-4 w-4 text-indigo-400" />
                                Manager
                            </button>

                            {/* PC Mode Login Trigger */}
                            <button
                                type="button"
                                onClick={() => { setShowPCModal(true); setError(null); }}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-bold transition-all h-11 px-3 border border-emerald-950/50 bg-emerald-950/10 hover:bg-emerald-950/30 text-emerald-400 hover:text-emerald-300"
                            >
                                <Lock className="mr-2 h-4 w-4 text-emerald-400" />
                                PC Mode
                            </button>
                        </div>

                        <p className="text-center text-xs text-slate-650 mt-4 leading-relaxed">
                            By clicking continue, you agree to our <a href="#" className="underline underline-offset-4 text-slate-400 hover:text-white">Terms</a> and <a href="#" className="underline underline-offset-4 text-slate-400 hover:text-white">Privacy</a>.
                        </p>
                    </div>
                </div>

                {/* Right Column: Visual Section */}
                <div className="hidden md:flex flex-col relative text-white p-12 justify-between overflow-hidden">
                    <div className="absolute inset-0 bg-slate-950">
                        {/* Beautiful gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-indigo-500/20 z-10" />
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1574&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                    </div>

                    <div className="relative z-20 flex items-center gap-2 font-bold text-lg">
                        <div className="bg-white/5 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg">
                            <LayoutDashboard className="text-amber-400 w-5 h-5 animate-pulse-slow" />
                        </div>
                        Team Tracker Inc
                    </div>

                    <div className="relative z-20 space-y-4">
                        <blockquote className="space-y-2">
                            <p className="text-xl font-medium leading-relaxed text-slate-200 italic">
                                &ldquo;Great teams don&rsquo;t just work &mdash; they track, improve, and succeed.&rdquo;
                            </p>
                        </blockquote>
                        <div className="h-1 w-12 bg-amber-500 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

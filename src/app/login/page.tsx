'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, LayoutDashboard, Users, X, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [managerPassword, setManagerPassword] = useState('');
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
                router.refresh();
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleManagerLogin = async () => {
        if (managerPassword === 'inter223') {
            try {
                // Call server-side API to set manager session
                const response = await fetch('/api/auth/manager-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ passkey: managerPassword }),
                });

                if (!response.ok) {
                    setError('Failed to authenticate manager');
                    return;
                }

                setShowManagerModal(false);
                setManagerPassword('');
                router.push('/guest');
            } catch (err) {
                console.error('Manager login error:', err);
                setError('Failed to authenticate manager');
            }
        } else {
            setError('Invalid manager passkey');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 md:p-10 bg-slate-100">
            {/* Manager Password Modal */}
            {showManagerModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => {
                                setShowManagerModal(false);
                                setManagerPassword('');
                                setError(null);
                            }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6 pt-2">
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 w-14 h-14 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center mx-auto mb-4">
                                <Users className="text-white" size={28} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-1">Manager Access</h2>
                            <p className="text-slate-500 text-sm">Enter the secure passkey to retrieve team data.</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={managerPassword}
                                    onChange={(e) => setManagerPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleManagerLogin()}
                                    placeholder="Enter passkey"
                                    autoFocus
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                />
                            </div>

                            <button
                                onClick={handleManagerLogin}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-[0.98]"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Split Card */}
            <div className="w-full max-w-sm md:max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2 min-h-[500px] md:min-h-[600px] border border-slate-200/50">

                {/* Left Column: Form Section */}
                <div className="flex flex-col justify-center p-8 md:p-12 h-full relative">
                    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">

                        {/* Header */}
                        <div className="text-center md:text-left space-y-2">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <div className=" bg-yellow-400 p-1.5 rounded-lg">
                                    <LayoutDashboard className="text-white w-5 h-5" />
                                </div>
                                <span className="font-bold text-lg tracking-tight text-slate-900">Team Tracker</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
                            <p className="text-sm text-slate-500">
                                Enter your email below to login to your account
                            </p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && !showManagerModal && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-lg flex items-center justify-center text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700" htmlFor="email">
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
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700" htmlFor="password">
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
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full bg-slate-900 text-slate-50 hover:bg-slate-900/90 shadow-sm"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-slate-200">
                            <span className="relative z-10 bg-white px-2 text-slate-500 font-medium text-xs uppercase tracking-wider">
                                Or continue with
                            </span>
                        </div>

                        {/* Manager Login Trigger */}
                        <button
                            type="button"
                            onClick={() => { setShowManagerModal(true); setError(null); }}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900"
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Manager Access
                        </button>

                        <p className="text-center text-xs text-slate-500 mt-4">
                            By clicking continue, you agree to our <a href="#" className="underline underline-offset-4 hover:text-slate-900">Terms of Service</a> and <a href="#" className="underline underline-offset-4 hover:text-slate-900">Privacy Policy</a>.
                        </p>
                    </div>
                </div>

                {/* Right Column: Visual Section */}
                <div className="hidden md:flex flex-col relative bg-slate-900 text-white p-10 justify-between">
                    <div className="absolute inset-0 bg-zinc-900">
                        {/* Abstract Background Pattern */}
                        <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
                            <defs>
                                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: 'rgb(100,100,255)', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: 'rgb(200,200,255)', stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1574&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent"></div>
                    </div>

                    <div className="relative z-10 flex items-center gap-2 font-medium text-lg">
                        <div className=" bg-white/10 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
                            <LayoutDashboard className="text-white w-5 h-5" />
                        </div>
                        Team Tracker Inc
                    </div>

                    <div className="relative z-10">
                        <blockquote className="space-y-2">
                            <p className="text-lg font-medium leading-relaxed">
                                &ldquo;Great teams don&rsquo;t just work &mdash; they track, improve, and succeed.&rdquo;
                            </p>
                        </blockquote>
                    </div>
                </div>
            </div>
        </div>
    );
}

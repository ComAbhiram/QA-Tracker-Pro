'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, LayoutDashboard, Users, X } from 'lucide-react';
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

    const handleManagerLogin = () => {
        if (managerPassword === 'inter223') {
            setShowManagerModal(false);
            setManagerPassword('');
            router.push('/guest');
        } else {
            setError('Invalid manager passkey');
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Manager Password Modal */}
            {showManagerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => {
                                setShowManagerModal(false);
                                setManagerPassword('');
                                setError(null);
                            }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Users className="text-white" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Manager Access</h2>
                            <p className="text-slate-600">Enter the manager passkey to continue</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    value={managerPassword}
                                    onChange={(e) => setManagerPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleManagerLogin()}
                                    placeholder="Enter passkey"
                                    autoFocus
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all text-slate-700"
                                />
                            </div>

                            <button
                                onClick={handleManagerLogin}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-start pl-8 pr-8 md:pr-12 lg:pr-16 py-8 bg-white overflow-y-auto">
                <div className="w-full max-w-lg">
                    {/* Logo/Brand */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-yellow-500 rounded-lg">
                            <LayoutDashboard className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Team Tracker</h2>
                            <p className="text-sm text-slate-500">Project Management</p>
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
                        <p className="text-slate-600">Sign in to access your dashboard</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && !showManagerModal && (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
                                <Lock size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none transition-all text-slate-700"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500 outline-none transition-all text-slate-700"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                'Sign In'
                            )}
                        </button>

                        {/* Manager Login Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowManagerModal(true);
                                setError(null);
                            }}
                            className="w-full py-3.5 bg-white hover:bg-slate-50 text-indigo-600 font-bold rounded-xl border-2 border-indigo-500 hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                        >
                            <Users size={20} />
                            Login as a Manager
                        </button>

                        <div className="text-center pt-2">
                            <a href="#" className="text-sm text-slate-500 hover:text-yellow-600 font-medium transition-colors">
                                Forgot your password?
                            </a>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Image */}
            <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-yellow-400 to-yellow-600">
                <Image
                    src="/login-bg.jpg"
                    alt="Login Background"
                    fill
                    className="object-cover"
                    priority
                />
            </div>
        </div>
    );

}

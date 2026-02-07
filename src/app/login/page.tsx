'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, Eye, Users } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Logo/Brand */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-yellow-500 rounded-lg">
                            <Eye className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">QA Tracker</h2>
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
                        {error && (
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

                        {/* Guest Login Button */}
                        <button
                            type="button"
                            onClick={() => router.push('/guest')}
                            className="w-full py-3.5 bg-white hover:bg-slate-50 text-yellow-600 font-bold rounded-xl border-2 border-yellow-500 hover:border-yellow-600 transition-all flex items-center justify-center gap-2"
                        >
                            <Users size={20} />
                            Login as Guest
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

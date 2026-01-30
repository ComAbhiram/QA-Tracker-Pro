
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ClipboardList,
    Calendar,
    BarChart3,
    Search,
    CalendarDays,
    CheckSquare,
    XSquare,
    Target,
    PlusCircle,
    UserSquare,
    Settings,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    Database,
    Shield,
    LogOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NavItem {
    label: string;
    icon: React.ReactNode;
    href: string;
    badge?: number;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

export function Sidebar() {
    const pathname = usePathname();

    // Hide sidebar on login page
    if (pathname === '/login') return null;

    const [collapsed, setCollapsed] = useState(true);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        main: true,
        analytics: true,
        projects: true,
        requests: true,
        labels: true
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const [userRole, setUserRole] = useState<string | null>(null);
    const [sidebarTitle, setSidebarTitle] = useState('QA Tracker');

    useEffect(() => {
        // Fetch user role for sidebar visibility
        const fetchRole = async () => {
            // Dynamic import to avoid circular dependency if any (though usually fine here)
            const { supabase } = await import('@/lib/supabase');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('user_profiles').select('role, team_id').eq('id', user.id).single();
                if (profile) {
                    setUserRole(profile.role);

                    if (profile.team_id) {
                        const { data: team } = await supabase.from('teams').select('name').eq('id', profile.team_id).single();
                        if (team && team.name !== 'QA Team') {
                            setSidebarTitle('Team Tracker');
                        }
                    }
                }
            }
        };
        fetchRole();
    }, []);

    const navSections: Record<string, NavSection> = {
        main: {
            title: 'MAIN',
            items: [
                { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/' },
                { label: 'Task Tracker', icon: <ClipboardList size={18} />, href: '/tracker' },
                { label: 'Schedule', icon: <CalendarDays size={18} />, href: '/schedule' },
                ...(userRole === 'super_admin' ? [{ label: 'Super Admin', icon: <Shield size={18} />, href: '/admin' }] : []),
            ]
        },
        analytics: {
            title: 'ANALYTICS',
            items: [
                { label: 'Reports', icon: <BarChart3 size={18} />, href: '/reports' },
                { label: 'Analytics', icon: <Search size={18} />, href: '/analytics' },
                { label: 'Attendance', icon: <Calendar size={18} />, href: '/attendance' },
            ]
        },
        projects: {
            title: 'PROJECTS',
            items: [
                { label: 'Manage Projects', icon: <Database size={18} />, href: '/projects' },
                { label: 'Completed', icon: <CheckSquare size={18} />, href: '/projects/completed' },
                { label: 'Rejected', icon: <XSquare size={18} />, href: '/projects/rejected' },
                { label: 'Milestones', icon: <Target size={18} />, href: '/projects/milestones' },
            ]
        },
        requests: {
            title: 'REQUESTS',
            items: [
                { label: 'Submit Request', icon: <PlusCircle size={18} />, href: '/requests/new' },
            ]
        }
    };

    return (
        <>
            {/* Floating Toggle Button (Visible only when collapsed on mobile) */}
            <button
                onClick={() => setCollapsed(false)}
                className={`lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-indigo-900 text-white shadow-lg transition-all duration-300 hover:bg-indigo-800 ${!collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                aria-label="Open Sidebar"
            >
                <Menu size={24} />
            </button>

            {/* Sidebar */}
            <nav className={`sidebar ${collapsed ? '-translate-x-full' : 'translate-x-0'} lg:translate-x-0`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <LayoutDashboard size={20} />
                        </div>
                        {sidebarTitle}
                    </div>
                    {/* Close Button Inside Sidebar */}
                    <button
                        onClick={() => setCollapsed(true)}
                        className="text-slate-400 hover:text-slate-600 transition-colors lg:hidden ml-auto"
                        aria-label="Close Sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-nav custom-scrollbar">
                    {Object.entries(navSections).map(([key, section]) => (
                        <div key={key} className="mb-2">
                            <div className="nav-section-title">
                                <span>{section.title}</span>
                            </div>

                            <div className={`space-y-1`}>
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon flex items-center justify-center">{item.icon}</span>
                                            <span className="nav-text">{item.label}</span>
                                            {item.badge && (
                                                <span className="ml-auto bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-auto border-t border-slate-100 p-4">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/login';
                        }}
                        className={`flex items-center gap-3 w-full p-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all ${collapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span className="font-medium">Sign Out</span>}
                    </button>
                </div>
            </nav>

            {/* Overlay for mobile */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setCollapsed(true)}
                />
            )}
        </>
    );
}

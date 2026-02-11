
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
    LogOut,
    TrendingUp,
    Eye,
    Folder,
    FolderKanban,
    Users,
    PauseCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useGuestMode } from '@/contexts/GuestContext';
import ManageTeamModal from './ManageTeamModal';

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
    const { isGuest, selectedTeamName, setGuestSession, clearGuestSession } = useGuestMode();

    // Hide sidebar on login and guest selection pages
    if (pathname === '/login' || pathname === '/guest') return null;

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
    const [sidebarTitle, setSidebarTitle] = useState('Team Tracker');
    const [showManageTeam, setShowManageTeam] = useState(false);

    // Guest Mode Team Switcher State
    interface Team {
        id: string;
        name: string;
    }
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);

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
                            setSidebarTitle(team.name); // Use team name if not QA Team
                        }
                    }
                }
            }
        };
        fetchRole();
    }, []);

    // Fetch teams for Manager Mode dropdown
    useEffect(() => {
        if (isGuest) {
            const fetchTeams = async () => {
                setLoadingTeams(true);
                try {
                    const { data, error } = await supabase.from('teams').select('id, name').order('name');
                    if (error) throw error;
                    if (data) setTeams(data);
                } catch (error) {
                    console.error('Error fetching teams for sidebar:', error);
                } finally {
                    setLoadingTeams(false);
                }
            };
            fetchTeams();
        }
    }, [isGuest]);

    const navSections: Record<string, NavSection> = {
        main: {
            title: 'MAIN',
            items: [
                { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/' },
                { label: 'Task Tracker', icon: <ClipboardList size={18} />, href: '/tracker' },
                { label: 'Schedule', icon: <CalendarDays size={18} />, href: '/schedule' },
                ...(userRole === 'super_admin' ? [{ label: 'Super Admin', icon: <Shield size={18} />, href: '/super-admin' }] : []),
            ]
        },
        projects: {
            title: 'PROJECTS',
            items: [
                { label: 'Project Overview', icon: <FolderKanban size={18} />, href: '/project-overview' },
                { label: 'Manage Projects', icon: <Database size={18} />, href: '/projects' },
                { label: 'On Hold', icon: <PauseCircle size={18} />, href: '/projects/on-hold' },
                { label: 'Completed', icon: <CheckSquare size={18} />, href: '/projects/completed' },
                { label: 'Rejected', icon: <XSquare size={18} />, href: '/projects/rejected' },
                { label: 'Forecast', icon: <TrendingUp size={18} />, href: '/projects/forecast' },
                { label: 'Milestones', icon: <Target size={18} />, href: '/projects/milestones' },
            ]
        },
        analytics: {
            title: 'ANALYTICS',
            items: [
                { label: 'Reports', icon: <BarChart3 size={18} />, href: '/reports' },
                { label: 'Analytics', icon: <Search size={18} />, href: '/analytics' },
                { label: 'Hubstaff', icon: <Calendar size={18} />, href: '/attendance' },
            ]
        },
        requests: {
            title: 'REQUESTS',
            items: [
                { label: 'Leave and WFH', icon: <LogOut size={18} className="rotate-180" />, href: '/requests/new' },
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
            <ManageTeamModal isOpen={showManageTeam} onClose={() => setShowManageTeam(false)} />
            <nav className={`sidebar ${collapsed ? '-translate-x-full' : 'translate-x-0'} lg:translate-x-0`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            {isGuest ? <Eye size={20} /> : <LayoutDashboard size={20} />}
                        </div>
                        {isGuest ? (
                            <div className="flex-1 min-w-0 relative group">
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <select
                                    className="w-full bg-slate-100 hover:bg-slate-200 border border-transparent hover:border-slate-300 text-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none rounded-md py-1.5 pl-2 pr-7 text-sm cursor-pointer truncate appearance-none transition-all duration-200"
                                    value={selectedTeamName || ''}
                                    onChange={(e) => {
                                        const newTeamName = e.target.value;
                                        const selectedTeam = teams.find(t => t.name === newTeamName);

                                        if (selectedTeam) {
                                            let targetTeamId = selectedTeam.id;

                                            // Mapping removed to allow QA Team to use its own ID
                                            // if (newTeamName.toLowerCase() === 'qa team') { ... }

                                            setGuestSession(targetTeamId, newTeamName);
                                            // Force reload to ensure all components and data fetchers update with new context
                                            // Add small delay to ensure localStorage write is registered
                                            setTimeout(() => {
                                                window.location.reload();
                                            }, 100);
                                        }
                                    }}
                                >
                                    <option value="" disabled>Select Team</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.name} className="text-slate-700 bg-white py-2">{team.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : sidebarTitle}
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

                <div className="mt-auto border-t border-slate-100 p-4 space-y-2">
                    {userRole !== 'super_admin' && !isGuest && (
                        <button
                            onClick={() => setShowManageTeam(true)}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all ${collapsed ? 'justify-center' : ''}`}
                        >
                            <Users size={20} />
                            {!collapsed && <span className="font-medium">Manage Team</span>}
                        </button>
                    )}
                    <button
                        onClick={async () => {
                            if (isGuest) {
                                clearGuestSession();
                                window.location.href = '/login';
                            } else {
                                await supabase.auth.signOut();
                                window.location.href = '/login';
                            }
                        }}
                        className={`flex items-center gap-3 w-full p-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all ${collapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span className="font-medium">{isGuest ? 'Exit Manager Mode' : 'Sign Out'}</span>}
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

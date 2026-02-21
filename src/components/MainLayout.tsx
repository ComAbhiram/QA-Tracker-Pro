'use client';

import { ReactNode } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useGuestMode } from '@/contexts/GuestContext';
import PCSelectionScreen from '@/components/PCSelectionScreen';
import NotificationBell from '@/components/NotificationBell';

export default function MainLayout({ children }: { children: ReactNode }) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/guest';
    const { isPCMode, selectedPCName } = useGuestMode();

    return (
        <>
            <Sidebar />
            <main
                className={`main-content flex flex-col transition-[margin] duration-300 ease-in-out ${!isAuthPage ? (isCollapsed ? 'lg:ml-20' : 'lg:ml-[16.25rem]') : ''} ${!isAuthPage ? 'pt-16 lg:pt-0' : ''}`}
            >
                {/* Sticky top header bar - visible on all pages */}
                {!isAuthPage && (
                    <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70 shadow-sm lg:shadow-none">
                        <div className="lg:hidden text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                            {isPCMode && selectedPCName ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    {selectedPCName}
                                </span>
                            ) : 'Team Tracker'}
                        </div>
                        <div className="hidden lg:block" /> {/* spacer on desktop */}
                        <div className="flex items-center gap-2">
                            {isPCMode && selectedPCName && <NotificationBell />}
                        </div>
                    </div>
                )}
                <div className="flex-1">
                    {isPCMode && !selectedPCName && !isAuthPage ? (
                        <PCSelectionScreen />
                    ) : (
                        children
                    )}
                </div>
                <footer className="mt-8 py-6 text-center text-xs font-semibold text-slate-900 dark:text-slate-400 uppercase tracking-widest border-t border-slate-200/50 dark:border-slate-800/50">
                    Crafted By Abhiram P Mohan : Lead QA, InterSmart
                </footer>
            </main>
        </>
    );
}

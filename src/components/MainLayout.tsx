'use client';

import { ReactNode } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useGuestMode } from '@/contexts/GuestContext';
import PCSelectionScreen from '@/components/PCSelectionScreen';

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

'use client';

import { ReactNode } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Sidebar } from '@/components/Sidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <>
            <Sidebar />
            <main
                className={`main-content flex flex-col transition-[margin] duration-300 ease-in-out`}
                style={{ marginLeft: isCollapsed ? '5rem' : '16.25rem' }}
            >
                <div className="flex-1">
                    {children}
                </div>
                <footer className="mt-8 py-6 text-center text-xs font-semibold text-slate-900 dark:text-slate-400 uppercase tracking-widest border-t border-slate-200/50 dark:border-slate-800/50">
                    Crafted By Abhiram P Mohan : Lead QA, InterSmart
                </footer>
            </main>
        </>
    );
}

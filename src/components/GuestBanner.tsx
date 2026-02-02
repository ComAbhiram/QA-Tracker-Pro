'use client';

import { useGuestMode } from '@/contexts/GuestContext';
import { useRouter } from 'next/navigation';
import { Eye, LogOut } from 'lucide-react';

export default function GuestBanner() {
    const { isGuest, selectedTeamName, clearGuestSession } = useGuestMode();
    const router = useRouter();

    if (!isGuest) return null;

    const handleExitGuestMode = () => {
        clearGuestSession();
        router.push('/login');
    };

    return (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <Eye size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-sm">Viewing as Guest</p>
                        <p className="text-xs text-amber-50">
                            {selectedTeamName} • Read-only mode
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleExitGuestMode}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm transition-all backdrop-blur-sm"
                >
                    <LogOut size={16} />
                    Exit Guest Mode
                </button>
            </div>
        </div>
    );
}

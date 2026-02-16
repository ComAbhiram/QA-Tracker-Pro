'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { Leave } from '@/lib/types';

interface QuickLeaveActionsProps {
    assigneeName: string;
    teamId?: string;
    currentLeave?: Leave | null;
    onUpdate: () => void;
}

export default function QuickLeaveActions({ assigneeName, teamId, currentLeave, onUpdate }: QuickLeaveActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const { success, error } = useToast();

    const handleQuickAction = async (type: string) => {
        if (loading) return;
        setLoading(type);

        try {
            // If clicking the same type that is already active, we might want to toggle it OFF (delete).
            // Or just re-apply. User requirement: "When clicked FL It automatically marked...".
            // Let's assume strict set for now. If they want to clear, maybe a separate "Clear" button or toggle?
            // "if marked as WFH automatically mark as the employee as Work from home".
            // Let's implement toggle: If active == type, delete. Else, upsert.

            const isToggleOff = currentLeave?.leave_type === type;
            const method = isToggleOff ? 'DELETE' : 'POST';

            const response = await fetch('/api/leaves/quick', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_member_name: assigneeName,
                    team_id: teamId,
                    leave_type: type,
                    // Date is handled by server as "Today" (IST) usually, or we pass it.
                    // Safer to pass "Today" from client to avoid server timezone mismatch if any, 
                    // BUT server should really control "Official Day".
                    // Let's pass the date to be explicit.
                    date: new Date().toISOString().split('T')[0]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update leave');
            }

            success(isToggleOff ? 'Leave cleared' : `Marked as ${type}`);
            onUpdate();
        } catch (err: any) {
            console.error('Quick Action Error:', err);
            error(err.message || 'Action failed');
        } finally {
            setLoading(null);
        }
    };

    const getButtonClass = (type: string, baseColor: string, hoverColor: string, activeColor: string) => {
        const isActive = currentLeave?.leave_type === type;
        const isLoading = loading === type;

        // If active, show solid color. If not, show outline/ghost.
        return `
            px-2 py-0.5 text-[10px] font-bold rounded border transition-all flex items-center gap-1
            ${isActive
                ? `${activeColor} text-white shadow-sm ring-1 ring-inset ring-black/10`
                : `bg-white dark:bg-slate-800 ${baseColor} hover:${hoverColor} border-slate-200 dark:border-slate-700`
            }
            ${loading && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            ${isLoading ? 'opacity-80' : ''}
        `;
    };

    return (
        <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* FL - Full Day Leave (Red) */}
            <button
                onClick={(e) => { e.stopPropagation(); handleQuickAction('Full Day'); }}
                className={getButtonClass('Full Day', 'text-red-600', 'bg-red-50', 'bg-red-600 border-red-700')}
                title="Mark Full Day Leave"
                disabled={!!loading}
            >
                {loading === 'Full Day' ? <Loader2 size={10} className="animate-spin" /> : 'FL'}
            </button>

            {/* HL - Half Day Leave (Yellow/Orange) */}
            <button
                onClick={(e) => { e.stopPropagation(); handleQuickAction('Half Day'); }}
                className={getButtonClass('Half Day', 'text-amber-600', 'bg-amber-50', 'bg-amber-500 border-amber-600')}
                title="Mark Half Day Leave"
                disabled={!!loading}
            >
                {loading === 'Half Day' ? <Loader2 size={10} className="animate-spin" /> : 'HL'}
            </button>

            {/* WFH - Work From Home (Blue) */}
            <button
                onClick={(e) => { e.stopPropagation(); handleQuickAction('WFH'); }}
                className={getButtonClass('WFH', 'text-blue-600', 'bg-blue-50', 'bg-blue-600 border-blue-700')}
                title="Mark Work From Home"
                disabled={!!loading}
            >
                {loading === 'WFH' ? <Loader2 size={10} className="animate-spin" /> : 'WFH'}
            </button>
        </div>
    );
}

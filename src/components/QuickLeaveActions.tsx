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
        setLoading(type); // specific type (FL, HL, WFH) for loading state

        try {
            // Map Quick Action types to DB Valid types
            let dbLeaveType = type;
            if (type === 'FL') dbLeaveType = 'Full Day Casual Leave';
            if (type === 'HL') dbLeaveType = 'Half Day Morning Session Casual Leave';
            if (type === 'WFH') dbLeaveType = 'WFH';

            // Check if WE are toggling off.
            // For FL: matches 'Full Day Casual Leave' (strictly for now, or maybe if current starts with Full Day?)
            // Let's use strict match to the default we set, OR if we want to be smart:
            // If current matches dbLeaveType, toggle off.

            const isToggleOff = currentLeave?.leave_type === dbLeaveType;
            const method = isToggleOff ? 'DELETE' : 'POST';

            const response = await fetch('/api/leaves/quick', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_member_name: assigneeName,
                    team_id: teamId,
                    leave_type: dbLeaveType,
                    date: new Date().toISOString().split('T')[0]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update leave');
            }

            success(isToggleOff ? 'Leave cleared' : `Marked as ${dbLeaveType}`);
            onUpdate();
        } catch (err: any) {
            console.error('Quick Action Error:', err);
            error(err.message || 'Action failed');
        } finally {
            setLoading(null);
        }
    };

    const getButtonClass = (btnType: 'FL' | 'HL' | 'WFH', baseColor: string, hoverColor: string, activeColor: string) => {
        let isActive = false;

        if (currentLeave?.leave_type) {
            if (btnType === 'FL') isActive = currentLeave.leave_type === 'Full Day Casual Leave';
            // For HL, light it up if it's ANY half day? Or just the one we set?
            // Let's light it up if it includes "Half Day" so it shows status even if set manually to Afternoon
            if (btnType === 'HL') isActive = currentLeave.leave_type.includes('Half Day');
            if (btnType === 'WFH') isActive = currentLeave.leave_type === 'WFH';
        }

        const isLoading = loading === btnType;

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
                onClick={(e) => { e.stopPropagation(); handleQuickAction('FL'); }}
                className={getButtonClass('FL', 'text-red-600', 'bg-red-50', 'bg-red-600 border-red-700')}
                title="Mark Full Day Casual Leave"
                disabled={!!loading}
            >
                {loading === 'FL' ? <Loader2 size={10} className="animate-spin" /> : 'FL'}
            </button>

            {/* HL - Half Day Leave (Yellow/Orange) */}
            <button
                onClick={(e) => { e.stopPropagation(); handleQuickAction('HL'); }}
                className={getButtonClass('HL', 'text-amber-600', 'bg-amber-50', 'bg-amber-500 border-amber-600')}
                title="Mark Half Day Morning Casual Leave"
                disabled={!!loading}
            >
                {loading === 'HL' ? <Loader2 size={10} className="animate-spin" /> : 'HL'}
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

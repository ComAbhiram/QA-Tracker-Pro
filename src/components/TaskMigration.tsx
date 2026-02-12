'use client';

import { useState, useRef } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useGuestMode } from '@/contexts/GuestContext';

export default function TaskMigration() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success: toastSuccess, error: toastError } = useToast();
    const { isGuest, selectedTeamId } = useGuestMode();
    const [userTeamId, setUserTeamId] = useState<string | null>(null);

    // Get current effective team ID
    const getEffectiveTeamId = async () => {
        if (isGuest && selectedTeamId) return selectedTeamId;

        // Fallback to fetching user's team if not in guest mode
        if (!userTeamId) {
            const { getCurrentUserTeam } = await import('@/utils/userUtils');
            const team = await getCurrentUserTeam();
            if (team) {
                setUserTeamId(team.team_id);
                return team.team_id;
            }
        }
        return userTeamId;
    };

    const handleExport = async () => {
        const teamId = await getEffectiveTeamId();
        if (!teamId) {
            toastError('Could not determine team context for export.');
            return;
        }

        setIsExporting(true);
        try {
            const response = await fetch(`/api/migration/export?teamId=${teamId}`);
            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `team_migration_${date}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toastSuccess('Team data (Projects & Tasks) exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toastError('Failed to export data.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const teamId = await getEffectiveTeamId();
        if (!teamId) {
            toastError('Could not determine target team for import.');
            return;
        }

        if (!confirm(`Importing will:\n1. Create missing Projects\n2. Create copies of all Tasks\n\nAre you sure you want to proceed?`)) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsImporting(true);
        try {
            const fileContent = await file.text();
            let data;
            try {
                data = JSON.parse(fileContent);
            } catch (jsonError) {
                throw new Error('Invalid JSON file format');
            }

            // Support both old (array) and new (object) formats for backward compatibility?
            // Or just assume new format. Let's handle new format primarily.
            // If it's an array, assume it's just tasks (legacy support)
            let payload = data;
            if (Array.isArray(data)) {
                payload = { tasks: data, projects: [] };
            }

            const response = await fetch('/api/migration/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, data: payload })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }

            toastSuccess(`Migration Complete: ${result.details.projectsCreated} Projects, ${result.details.tasksCreated} Tasks imported.`);
            // Optional: Trigger refresh
            window.location.reload();
        } catch (error: any) {
            console.error('Import error:', error);
            toastError(error.message || 'Failed to import data.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />

            <button
                onClick={handleImportClick}
                disabled={isImporting || isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors disabled:opacity-50 text-sm font-medium"
                title="Import Tasks from JSON"
            >
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import
            </button>

            <button
                onClick={handleExport}
                disabled={isImporting || isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors disabled:opacity-50 text-sm font-medium"
                title="Export Tasks for Migration"
            >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Export
            </button>
        </div>
    );
}

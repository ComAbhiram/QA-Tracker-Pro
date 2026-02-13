import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import Loader from './ui/Loader';
import * as XLSX from 'xlsx';
import { useToast } from '@/contexts/ToastContext';
import { useGuestMode } from '@/contexts/GuestContext';

export default function TaskMigration() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const projectFileInputRef = useRef<HTMLInputElement>(null);
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

            // Create link
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `team_migration_${date}.json`;

            // Append to body effectively but safely
            document.body.appendChild(a);

            // Trigger click
            a.click();

            // Cleanup after a small delay to ensure click registered and prevent React conflicts
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

            toastSuccess('Team data exported successfully!');
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

        if (!confirm('Importing will add Projects, Tasks, and Configuration (Phases) from the file to the current team.\n\nUse this to migrate data from another team.\n\nProceed?')) {
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

            toastSuccess(`Import complete: ${result.details.projectsCreated} Projects, ${result.details.tasksCreated} Tasks, ${result.details.subphasesCreated || 0} Phases.`);
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

    const handleProjectImportClick = () => {
        projectFileInputRef.current?.click();
    };

    const handleProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const teamId = await getEffectiveTeamId();
        if (!teamId) {
            toastError('Could not determine target team for import.');
            return;
        }

        if (!confirm(`Importing Projects from CSV/Excel:\n\n1. Reads "Name", "Description", "Status" columns\n2. Skips duplicates (by name)\n3. Creates new projects\n\nProceed?`)) {
            if (projectFileInputRef.current) projectFileInputRef.current.value = '';
            return;
        }

        setIsImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonData || jsonData.length === 0) {
                throw new Error('No data found in file');
            }

            // Map CSV columns to Project object
            // Expected columns: Name, Description, Status
            const projects = jsonData.map(row => {
                // Try to find Name column (case insensitive)
                const keys = Object.keys(row);
                const nameKey = keys.find(k => k.toLowerCase() === 'name' || k.toLowerCase() === 'project name');
                const descKey = keys.find(k => k.toLowerCase() === 'description');
                const statusKey = keys.find(k => k.toLowerCase() === 'status');

                if (!nameKey || !row[nameKey]) return null; // Skip if no name

                return {
                    name: row[nameKey],
                    description: descKey ? row[descKey] : '',
                    status: statusKey ? row[statusKey]?.toLowerCase() : 'active'
                };
            }).filter(p => p !== null);

            if (projects.length === 0) {
                throw new Error('No valid projects found. Please check columns: Name, Description, Status.');
            }

            // Send to existing import API
            const response = await fetch('/api/migration/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId,
                    data: { projects, tasks: [] } // Only projects
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }

            toastSuccess(`Project Import: ${result.details.projectsCreated} Created, ${result.details.projectsSkipped} Skipped.`);
            window.location.reload();

        } catch (error: any) {
            console.error('Project Import error:', error);
            toastError(error.message || 'Failed to import projects.');
        } finally {
            setIsImporting(false);
            if (projectFileInputRef.current) projectFileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* JSON Migration Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />
            {/* CSV/Excel Project Input */}
            <input
                type="file"
                ref={projectFileInputRef}
                onChange={handleProjectFileChange}
                accept=".csv, .xlsx, .xls"
                className="hidden"
            />

            {/* CSV Import Hidden as per request
            <button
                onClick={handleProjectImportClick}
                disabled={isImporting || isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors disabled:opacity-50 text-sm font-medium"
                title="Import Projects from CSV/Excel"
            >
                {isImporting ? <Loader size="xs" color="#16a34a" /> : <FileSpreadsheet size={16} />}
                Import CSV
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            */}

            <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-medium"
                title="Backup Team Data (JSON)"
            >
                <span className="flex items-center justify-center w-4 h-4">
                    {isExporting ? <Loader size="xs" /> : <Download size={16} />}
                </span>
                Backup
            </button>

            <button
                onClick={handleImportClick}
                disabled={isImporting || isExporting}
                className="btn btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-medium"
                title="Restore Team Data (JSON)"
            >
                {isImporting ? <Loader size="xs" /> : <Upload size={16} />}
                Restore
            </button>
        </div>
    );
}

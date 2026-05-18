// Compact table-based HTML templates matching the Task Tracker table design

export function buildWorkStatusTableHTML(params: {
    todayTasks: any[];
    sortedAssignees: string[];
    groupedTasks: Record<string, any[]>;
    statusStyles: Record<string, any>;
    getMemberColor: (name: string) => { border: string; bg: string; text: string; light: string };
    getEffectiveStatus: (task: any) => string;
    formatDate: (dateStr: string) => string;
    formatTime: (seconds: number) => string;
    hubstaffData: any;
    getHubstaffNameFromQA?: (name: string) => string;
}): string {
    const {
        todayTasks, sortedAssignees, groupedTasks,
        getMemberColor, getEffectiveStatus, formatDate, formatTime,
        hubstaffData, getHubstaffNameFromQA
    } = params;

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Status icon+color matching StatusBadge.tsx exactly
    const statusHTML = (status: string) => {
        const cfg: Record<string, { color: string; icon: string }> = {
            'In Progress': { color: '#1d4ed8', icon: '&#9654;' },       // blue-700
            'Being Developed': { color: '#9333ea', icon: '&#9874;' },   // purple-600
            'Completed': { color: '#047857', icon: '&#10004;' },        // emerald-700
            'Yet to Start': { color: '#64748b', icon: '&#9675;' },      // slate-500
            'Forecast': { color: '#7c3aed', icon: '&#9729;' },          // violet-600
            'On Hold': { color: '#d97706', icon: '&#9646;&#9646;' },    // amber-600
            'Ready for QA': { color: '#db2777', icon: '&#9200;' },      // pink-600
            'Assigned to QA': { color: '#0891b2', icon: '&#9200;' },    // cyan-600
            'Rejected': { color: '#dc2626', icon: '&#10006;' },         // red-600
            'Overdue': { color: '#dc2626', icon: '&#9888;' },           // red-600
        };
        const c = cfg[status] || { color: '#64748b', icon: '&#9679;' };
        return `<span style="display:inline-flex;align-items:center;gap:4px;font-weight:600;font-size:12px;color:${c.color};white-space:nowrap;">${c.icon} ${status}</span>`;
    };

    // Priority color matching PriorityBadge.tsx exactly
    const priorityHTML = (priority: string | null) => {
        if (!priority) return '<span style="color:#94a3b8;">-</span>';
        const colors: Record<string, string> = {
            'High': '#c2410c',      // orange-700
            'Urgent': '#991b1b',    // red-800
            'Medium': '#b45309',    // amber-700
            'Low': '#15803d',       // green-700
        };
        return `<span style="font-weight:700;font-size:12px;color:${colors[priority] || '#334155'};">${priority}</span>`;
    };

    // Hubstaff summary
    let hubstaffSection = '';
    if (hubstaffData && getHubstaffNameFromQA) {
        const teamActivities = hubstaffData.activities.filter((a: any) => {
            if (a.timeWorked <= 0) return false;
            const uName = a.userName.toLowerCase();
            return sortedAssignees.some(assignee => {
                const aName = assignee.toLowerCase();
                const hName = (getHubstaffNameFromQA(assignee) || '').toLowerCase();
                return uName === aName || uName === hName || uName.includes(aName) || aName.includes(uName);
            });
        });
        if (teamActivities.length > 0) {
            const totalTime = teamActivities.reduce((s: number, a: any) => s + a.timeWorked, 0);
            const avgAct = Math.round(teamActivities.reduce((s: number, a: any) => s + (a.activityPercentage || 0), 0) / teamActivities.length);
            hubstaffSection = `
            <div style="display:flex;align-items:center;gap:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 20px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Activity Summary</span>
                <span style="font-size:11px;color:#64748b;">${teamActivities.length} members</span>
                <span style="font-size:13px;font-weight:800;color:#0f172a;">⏱ ${formatTime(totalTime)}</span>
                <span style="font-size:13px;font-weight:800;color:#10b981;">✓ ${avgAct}%</span>
            </div>`;
        }
    }

    // Build member sections matching tracker exactly
    const memberSections = sortedAssignees.map(assignee => {
        const mc = getMemberColor(assignee);
        const tasks = groupedTasks[assignee];

        const taskRows = tasks.map((task: any) => {
            const es = getEffectiveStatus(task);
            let statusLabel = es;
            if (es === 'Overdue' && task.endDate) {
                const end = new Date(task.endDate); const now = new Date();
                end.setHours(23,59,59,999); now.setHours(0,0,0,0);
                const diff = Math.ceil((now.getTime() - end.getTime()) / 86400000);
                if (diff > 0) statusLabel = `Overdue`;
            }
            const startStr = task.startDate ? formatDate(task.startDate) : '-';
            const endStr = task.endDate ? formatDate(task.endDate) : '-';
            const overdueStyle = es === 'Overdue' ? 'background:#fef2f2;' : '';

            return `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#334155;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;">${task.projectName}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">${task.projectType || '-'}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;text-align:center;">${priorityHTML(task.priority)}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:12px;color:#475569;text-align:center;">${task.subPhase || '-'}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;text-align:center;">${statusHTML(statusLabel)}${es === 'Overdue' && task.endDate ? `<span style="color:#dc2626;font-size:10px;font-weight:700;margin-left:4px;">⚠</span>` : ''}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:11px;color:#475569;white-space:nowrap;text-align:center;">${startStr}</td>
                <td style="padding:10px 16px;font-size:11px;color:#475569;white-space:nowrap;text-align:center;${overdueStyle}${es === 'Overdue' ? 'color:#b91c1c;font-weight:600;' : ''}">${endStr}</td>
            </tr>`;
        }).join('');

        return `
        <div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <!-- Member Header matching tracker -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:${mc.bg};border-bottom:1px solid ${mc.light || '#e2e8f0'};">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.6);border:1px solid rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;color:${mc.text};">${assignee.charAt(0)}</div>
                    <span style="font-weight:700;font-size:11px;color:${mc.text};">${assignee}</span>
                </div>
            </div>
            <!-- Task Table -->
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                        <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Project</th>
                        <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Type</th>
                        <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Priority</th>
                        <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Task</th>
                        <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Status</th>
                        <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Start</th>
                        <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">End</th>
                    </tr>
                </thead>
                <tbody>${taskRows}</tbody>
            </table>
        </div>`;
    }).join('');

    const completedCount = todayTasks.filter(t => getEffectiveStatus(t) === 'Completed').length;
    const inProgressCount = todayTasks.filter(t => getEffectiveStatus(t) === 'In Progress').length;

    return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Inter', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
        </style>
        <div style="padding:8px;">
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div>
                    <h1 style="color:#0f172a;font-size:22px;font-weight:800;letter-spacing:-0.02em;">Work Status Report</h1>
                    <p style="color:#64748b;font-size:11px;font-weight:600;margin-top:2px;">QA Team • ${dateStr}</p>
                </div>
                <div style="display:flex;gap:8px;">
                    <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 14px;">
                        <p style="color:#94a3b8;font-size:8px;font-weight:800;text-transform:uppercase;">Total</p>
                        <p style="color:#0f172a;font-size:18px;font-weight:900;">${todayTasks.length}</p>
                    </div>
                    <div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 14px;">
                        <p style="color:#16a34a;font-size:8px;font-weight:800;text-transform:uppercase;">Done</p>
                        <p style="color:#16a34a;font-size:18px;font-weight:900;">${completedCount}</p>
                    </div>
                    <div style="text-align:center;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px 14px;">
                        <p style="color:#2563eb;font-size:8px;font-weight:800;text-transform:uppercase;">Active</p>
                        <p style="color:#2563eb;font-size:18px;font-weight:900;">${inProgressCount}</p>
                    </div>
                </div>
            </div>
            ${hubstaffSection}
            ${memberSections}
            <div style="margin-top:12px;text-align:center;">
                <p style="color:#94a3b8;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">POWERED BY QA TRACKER PRO</p>
            </div>
        </div>`;
}

export function buildWorkScheduleTableHTML(params: {
    scheduleTasks: any[];
    dateStr: string;
    getEffectiveStatus: (task: any) => string;
    formatDate: (dateStr: string) => string;
}): string {
    const { scheduleTasks, dateStr, getEffectiveStatus, formatDate } = params;

    const statusHTML = (status: string) => {
        const cfg: Record<string, { color: string; icon: string }> = {
            'In Progress': { color: '#1d4ed8', icon: '&#9654;' },
            'Completed': { color: '#047857', icon: '&#10004;' },
            'Yet to Start': { color: '#64748b', icon: '&#9675;' },
            'On Hold': { color: '#d97706', icon: '&#9646;&#9646;' },
            'Overdue': { color: '#dc2626', icon: '&#9888;' },
        };
        const c = cfg[status] || { color: '#64748b', icon: '&#9679;' };
        return `<span style="display:inline-flex;align-items:center;gap:4px;font-weight:600;font-size:12px;color:${c.color};white-space:nowrap;">${c.icon} ${status}</span>`;
    };

    const priorityHTML = (priority: string | null) => {
        if (!priority) return '<span style="color:#94a3b8;">-</span>';
        const colors: Record<string, string> = { 'High': '#c2410c', 'Urgent': '#991b1b', 'Medium': '#b45309', 'Low': '#15803d' };
        return `<span style="font-weight:700;font-size:12px;color:${colors[priority] || '#334155'};">${priority}</span>`;
    };

    const taskRows = scheduleTasks.length === 0
        ? `<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8;font-size:14px;font-weight:600;">No active tasks scheduled.</td></tr>`
        : scheduleTasks.map(task => {
            const es = getEffectiveStatus(task);
            const assignees = [task.assignedTo, task.assignedTo2, ...(task.additionalAssignees || [])].filter(Boolean).join(', ') || 'Unassigned';
            const startStr = task.startDate ? formatDate(task.startDate) : '-';
            const endStr = task.endDate ? formatDate(task.endDate) : '-';
            const overdueStyle = es === 'Overdue' ? 'background:#fef2f2;' : '';
            return `<tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#334155;text-align:left;">${task.projectName}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">${task.projectType || '-'}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;text-align:center;">${priorityHTML(task.priority)}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:12px;color:#475569;text-align:center;">${task.subPhase || '-'}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;text-align:center;">${statusHTML(es)}</td>
                <td style="padding:10px 16px;border-right:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#475569;text-align:center;">${assignees}</td>
                <td style="padding:10px 16px;font-size:11px;color:#475569;white-space:nowrap;text-align:center;">${startStr} — ${endStr}</td>
            </tr>`;
        }).join('');

    return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Inter', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
        </style>
        <div style="padding:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div>
                    <h1 style="color:#0f172a;font-size:22px;font-weight:800;letter-spacing:-0.02em;">Upcoming Work Schedule</h1>
                    <p style="color:#64748b;font-size:11px;font-weight:600;margin-top:2px;">${dateStr}</p>
                </div>
                <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 14px;">
                    <p style="color:#94a3b8;font-size:8px;font-weight:800;text-transform:uppercase;">Total</p>
                    <p style="color:#0f172a;font-size:18px;font-weight:900;">${scheduleTasks.length}</p>
                </div>
            </div>
            <div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Project</th>
                            <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Type</th>
                            <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Priority</th>
                            <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Task</th>
                            <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Status</th>
                            <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border-right:1px solid #e2e8f0;">Assignee</th>
                            <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;">Period</th>
                        </tr>
                    </thead>
                    <tbody>${taskRows}</tbody>
                </table>
            </div>
            <div style="margin-top:12px;text-align:center;">
                <p style="color:#94a3b8;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">POWERED BY QA TRACKER PRO</p>
            </div>
        </div>`;
}

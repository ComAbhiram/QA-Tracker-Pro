// Compact table-based HTML templates for report image generation
// Used by DailyReportsModal.tsx

interface StatusStyle {
    gradient: string;
    color: string;
    icon: string;
}

interface MemberColor {
    border: string;
    bg: string;
    text: string;
    light: string;
}

interface WorkStatusParams {
    todayTasks: any[];
    sortedAssignees: string[];
    groupedTasks: Record<string, any[]>;
    statusStyles: Record<string, StatusStyle>;
    getMemberColor: (name: string) => MemberColor;
    getEffectiveStatus: (task: any) => string;
    formatDate: (dateStr: string) => string;
    formatTime: (seconds: number) => string;
    hubstaffData: any;
    getHubstaffNameFromQA?: (name: string) => string;
}

export function buildWorkStatusTableHTML(params: WorkStatusParams): string {
    const {
        todayTasks, sortedAssignees, groupedTasks, statusStyles,
        getMemberColor, getEffectiveStatus, formatDate, formatTime,
        hubstaffData, getHubstaffNameFromQA
    } = params;

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Build hubstaff summary section
    let hubstaffSection = '';
    if (hubstaffData) {
        const teamActivities = hubstaffData.activities.filter((a: any) => {
            if (a.timeWorked <= 0) return false;
            const uName = a.userName.toLowerCase();
            return sortedAssignees.some(assignee => {
                const aName = assignee.toLowerCase();
                const hName = (getHubstaffNameFromQA?.(assignee) || '').toLowerCase();
                return uName === aName || uName === hName || uName.includes(aName) || aName.includes(uName);
            });
        });

        if (teamActivities.length > 0) {
            const totalTimeWorked = teamActivities.reduce((sum: number, a: any) => sum + a.timeWorked, 0);
            const avgActivity = Math.round(teamActivities.reduce((sum: number, a: any) => sum + (a.activityPercentage || 0), 0) / teamActivities.length);

            hubstaffSection = `
            <div style="background: white; border: 1px solid #e2e8f0; padding: 16px 24px; margin-bottom: 20px; border-radius: 12px; display: flex; align-items: center; gap: 32px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: linear-gradient(135deg, #a855f7, #8b5cf6); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    </div>
                    <div>
                        <p style="color: #0f172a; font-size: 14px; font-weight: 800; margin: 0;">Activity Summary</p>
                        <p style="color: #64748b; font-size: 11px; margin: 2px 0 0 0; font-weight: 600;">${teamActivities.length} Members Active</p>
                    </div>
                </div>
                <div style="display: flex; gap: 32px; margin-left: auto;">
                    <div style="text-align: center;">
                        <p style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0;">TIME SPENT</p>
                        <p style="color: #0f172a; font-size: 20px; font-weight: 900; margin: 0;">${formatTime(totalTimeWorked)}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0;">ACTIVE</p>
                        <p style="color: #10b981; font-size: 20px; font-weight: 900; margin: 0;">${avgActivity}%</p>
                    </div>
                </div>
            </div>`;
        }
    }

    // Build member table sections
    const memberSections = sortedAssignees.map(assignee => {
        const mc = getMemberColor(assignee);
        const tasks = groupedTasks[assignee];

        const taskRows = tasks.map((task: any) => {
            const effectiveStatus = getEffectiveStatus(task);
            const sStyle = statusStyles[effectiveStatus] || statusStyles['On Hold'];
            let statusLabel = effectiveStatus;
            if (effectiveStatus === 'Overdue' && task.endDate) {
                const end = new Date(task.endDate);
                const now = new Date();
                end.setHours(23, 59, 59, 999);
                now.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > 0) statusLabel = `Overdue (+${diffDays}d)`;
            }

            const startStr = task.startDate ? formatDate(task.startDate) : '-';
            const endStr = task.endDate ? formatDate(task.endDate) : '-';

            return `
            <tr>
                <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${task.projectName}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">${task.subPhase || '-'}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9;">
                    <span style="background: ${effectiveStatus === 'Completed' ? '#dcfce7' : effectiveStatus === 'In Progress' ? '#dbeafe' : effectiveStatus === 'Yet to Start' ? '#fef3c7' : effectiveStatus === 'Overdue' ? '#fee2e2' : '#f3e8ff'}; color: ${sStyle.color}; padding: 2px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; white-space: nowrap;">${statusLabel}</span>
                </td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #64748b; white-space: nowrap;">${startStr} — ${endStr}</td>
            </tr>`;
        }).join('');

        return `
        <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${mc.bg}; border-left: 4px solid ${mc.border}; border-radius: 0 8px 8px 0;">
                <div style="width: 28px; height: 28px; background: ${mc.border}; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 13px;">${assignee.charAt(0)}</div>
                <span style="color: #0f172a; font-size: 15px; font-weight: 800;">${assignee}</span>
                <span style="color: #94a3b8; font-size: 12px; font-weight: 600; margin-left: 4px;">(${tasks.length} tasks)</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 0;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th style="padding: 5px 10px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Project</th>
                        <th style="padding: 5px 10px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Phase</th>
                        <th style="padding: 5px 10px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Status</th>
                        <th style="padding: 5px 10px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Period</th>
                    </tr>
                </thead>
                <tbody>${taskRows}</tbody>
            </table>
        </div>`;
    }).join('');

    // Summary counts
    const completedCount = todayTasks.filter(t => getEffectiveStatus(t) === 'Completed').length;
    const inProgressCount = todayTasks.filter(t => getEffectiveStatus(t) === 'In Progress').length;
    const overdueCount = todayTasks.filter(t => getEffectiveStatus(t) === 'Overdue').length;

    return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Poppins', sans-serif; box-sizing: border-box; }
        </style>
        <div style="padding: 10px;">
            <!-- Header -->
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 5px; height: 32px; background: #3b82f6; border-radius: 3px;"></div>
                        <h1 style="color: #0f172a; font-size: 32px; margin: 0; font-weight: 900; letter-spacing: -0.04em;">Work Status Report</h1>
                    </div>
                    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 15px; font-weight: 600;">QA Team • ${dateStr}</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 16px; text-align: center; border-bottom: 3px solid #3b82f6;">
                        <p style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0;">Total</p>
                        <p style="color: #0f172a; font-size: 22px; font-weight: 900; margin: 0;">${todayTasks.length}</p>
                    </div>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 16px; text-align: center; border-bottom: 3px solid #10b981;">
                        <p style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0;">Done</p>
                        <p style="color: #10b981; font-size: 22px; font-weight: 900; margin: 0;">${completedCount}</p>
                    </div>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 16px; text-align: center; border-bottom: 3px solid #3b82f6;">
                        <p style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0;">Active</p>
                        <p style="color: #3b82f6; font-size: 22px; font-weight: 900; margin: 0;">${inProgressCount}</p>
                    </div>
                    ${overdueCount > 0 ? `<div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 16px; text-align: center; border-bottom: 3px solid #ef4444;">
                        <p style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0;">Overdue</p>
                        <p style="color: #ef4444; font-size: 22px; font-weight: 900; margin: 0;">${overdueCount}</p>
                    </div>` : ''}
                </div>
            </div>

            ${hubstaffSection}

            <!-- Member Tables -->
            ${memberSections}

            <div style="margin-top: 16px; text-align: center;">
                <p style="color: #94a3b8; font-size: 10px; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.6;">
                    POWERED BY <span style="color: #475569; font-weight: 900;">QA TRACKER PRO</span>
                </p>
            </div>
        </div>
    `;
}


export function buildWorkScheduleTableHTML(params: {
    scheduleTasks: any[];
    dateStr: string;
    getEffectiveStatus: (task: any) => string;
    formatDate: (dateStr: string) => string;
}): string {
    const { scheduleTasks, dateStr, getEffectiveStatus, formatDate } = params;

    const statusColor = (s: string) => {
        if (s === 'Completed') return '#10b981';
        if (s === 'In Progress') return '#3b82f6';
        if (s === 'Yet to Start') return '#f59e0b';
        if (s === 'Overdue') return '#ef4444';
        if (s === 'On Hold') return '#8b5cf6';
        return '#64748b';
    };
    const statusBg = (s: string) => {
        if (s === 'Completed') return '#dcfce7';
        if (s === 'In Progress') return '#dbeafe';
        if (s === 'Yet to Start') return '#fef3c7';
        if (s === 'Overdue') return '#fee2e2';
        if (s === 'On Hold') return '#f3e8ff';
        return '#f1f5f9';
    };

    const taskRows = scheduleTasks.length === 0
        ? `<tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 16px; font-weight: 600;">No active tasks scheduled.</td></tr>`
        : scheduleTasks.map(task => {
            const effectiveStatus = getEffectiveStatus(task);
            const assignees = [task.assignedTo, task.assignedTo2, ...(task.additionalAssignees || [])].filter(Boolean).join(', ') || 'Unassigned';
            const startStr = task.startDate ? formatDate(task.startDate) : '-';
            const endStr = task.endDate ? formatDate(task.endDate) : '-';

            return `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a;">${task.projectName}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">${task.subPhase || '-'}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
                    <span style="background: ${statusBg(effectiveStatus)}; color: ${statusColor(effectiveStatus)}; padding: 2px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; white-space: nowrap;">${effectiveStatus}</span>
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #475569; font-weight: 600;">${assignees}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #64748b; white-space: nowrap;">${startStr} — ${endStr}</td>
            </tr>`;
        }).join('');

    return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Poppins', sans-serif; box-sizing: border-box; }
        </style>
        <div style="padding: 10px;">
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 5px; height: 32px; background: #3b82f6; border-radius: 3px;"></div>
                        <h1 style="color: #0f172a; font-size: 32px; margin: 0; font-weight: 900; letter-spacing: -0.04em;">Upcoming Work Schedule</h1>
                    </div>
                    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 15px; font-weight: 600;">${dateStr}</p>
                </div>
                <div style="background: linear-gradient(135deg, #a855f7, #8b5cf6); border-radius: 12px; color: white; padding: 10px 20px; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; opacity: 0.8;">TOTAL LOAD</span>
                    <span style="font-size: 28px; font-weight: 900; line-height: 1;">${scheduleTasks.length}</span>
                    <span style="font-size: 12px; font-weight: 700; opacity: 0.8;">Tasks</span>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Project</th>
                        <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Phase</th>
                        <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Status</th>
                        <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Assignee</th>
                        <th style="padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0;">Period</th>
                    </tr>
                </thead>
                <tbody>${taskRows}</tbody>
            </table>

            <div style="margin-top: 16px; text-align: center;">
                <p style="color: #94a3b8; font-size: 10px; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.6;">
                    POWERED BY <span style="color: #475569; font-weight: 900;">QA TRACKER PRO</span>
                </p>
            </div>
        </div>
    `;
}

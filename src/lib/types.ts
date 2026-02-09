
export interface DBTask {
    id: number;
    project_name: string;
    project_type: string | null;
    sub_phase: string | null;
    priority: string | null;
    pc: string | null;
    assigned_to: string | null;
    assigned_to2: string | null;
    additional_assignees: string[] | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    actual_completion_date: string | null;
    include_saturday: boolean | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    completed_at: string | null;
    comments: string | null;
    current_updates: string | null;
    bug_count: number | null;
    html_bugs: number | null;
    functional_bugs: number | null;
    deviation_reason: string | null;
    sprint: string | null;
    sprint_link: string | null;
    days_allotted: number | null;
    time_taken: string | null;
    days_taken: number | null;
    deviation: number | null;
    activity_percentage: number | null;
    created_at: string;
}

export interface DBProject {
    id: number;
    name: string;
    description: string | null;
    status: string;
    hubstaff_id: number | null;
    created_at: string;
}

export interface Task {
    id: number;
    projectName: string;
    projectType: string | null;
    subPhase: string | null;
    priority: string | null;
    pc: string | null;
    assignedTo: string | null;
    assignedTo2: string | null;
    additionalAssignees?: string[];
    status: string;
    startDate: string | null;
    endDate: string | null;
    actualCompletionDate: string | null;
    includeSaturday: boolean;
    actualStartDate: string | null;
    actualEndDate: string | null;
    startTime: string | null;
    endTime: string | null;
    completedAt: string | null;
    comments: string | null;
    currentUpdates: string | null;
    bugCount: number;
    htmlBugs: number;
    functionalBugs: number;
    deviationReason: string | null;
    sprint: string | null;
    sprintLink: string | null;
    daysAllotted: number | null;
    timeTaken: string | null; // format 00:00:00
    daysTaken: number | null;
    deviation: number | null;
    activityPercentage: number | null;
    createdAt: string;
    teamId?: string; // Multi-tenancy support
}

export interface Project {
    id: number;
    name: string;
    description: string | null;
    status: string;
    hubstaffId: number | null;
    createdAt: string;
    teamId?: string; // Multi-tenancy support
}

export const mapTaskFromDB = (task: DBTask): Task => ({
    id: task.id,
    projectName: task.project_name || '',
    projectType: task.project_type,
    subPhase: task.sub_phase,
    priority: task.priority,
    pc: task.pc,
    assignedTo: task.assigned_to,
    assignedTo2: task.assigned_to2,
    additionalAssignees: task.additional_assignees || [],
    status: (task.status || 'In Progress').trim(),
    startDate: task.start_date,
    endDate: task.end_date,
    actualCompletionDate: task.actual_completion_date,
    includeSaturday: task.include_saturday || false,
    actualStartDate: task.actual_start_date,
    actualEndDate: task.actual_end_date,
    startTime: task.start_time || '09:30',
    endTime: task.end_time || '18:30',
    completedAt: task.completed_at,
    comments: task.comments,
    currentUpdates: task.current_updates,
    bugCount: task.bug_count || 0,
    htmlBugs: task.html_bugs || 0,
    functionalBugs: task.functional_bugs || 0,
    deviationReason: task.deviation_reason,
    sprint: task.sprint,
    sprintLink: task.sprint_link,
    daysAllotted: task.days_allotted || 0,
    timeTaken: task.time_taken || '00:00:00',
    daysTaken: task.days_taken || 0,
    deviation: task.deviation || 0,
    activityPercentage: task.activity_percentage || 0,
    createdAt: task.created_at,
    teamId: (task as any).team_id
});

export const mapProjectFromDB = (project: DBProject): Project => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    hubstaffId: project.hubstaff_id,
    createdAt: project.created_at,
    teamId: (project as any).team_id
});

// Overdue calculation utilities
export function getISTDate(): Date {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    return new Date(utcTime + istOffset);
}

export function isTaskOverdue(task: Task): boolean {
    // Rejected tasks are never overdue
    const s = (task.status || '').toLowerCase();
    if (s === 'rejected') return false;
    if (!task.endDate) return false;

    const endDate = new Date(task.endDate);

    // Set end of work day to 6:30 PM IST on the end date
    const endOfWorkDay = new Date(endDate);
    endOfWorkDay.setHours(18, 30, 0, 0);

    // For completed tasks, check if they were completed AFTER 6:30 PM IST on the due date
    if (s === 'completed') {
        // Try to get completion timestamp from completedAt or actualCompletionDate
        const completionTimestamp = task.completedAt || task.actualCompletionDate;

        if (!completionTimestamp) {
            // No completion timestamp available - assume completed on time
            return false;
        }

        const completedDate = new Date(completionTimestamp);

        // Task is overdue if it was completed AFTER 6:30 PM IST on the due date
        return completedDate > endOfWorkDay;
    }

    // For active tasks, check if current time is past 6:30 PM on the end date
    const istNow = getISTDate();
    return istNow > endOfWorkDay;
}

export function getOverdueDays(task: Task): number {
    if (!isTaskOverdue(task) || !task.endDate) return 0;

    const istNow = getISTDate();
    const endDate = new Date(task.endDate);

    // Calculate days difference
    const diffTime = istNow.getTime() - endDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}

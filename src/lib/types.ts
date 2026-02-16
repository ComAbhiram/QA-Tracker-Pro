
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
    include_sunday: boolean | null;
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
    includeSunday: boolean;
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

export interface Leave {
    id: number;
    team_member_id: string; // auth.users id
    team_member_name: string;
    leave_date: string; // YYYY-MM-DD
    leave_type: string;
    reason?: string;
    status: string; // 'Approved', 'Pending', 'Rejected'
    created_by?: string;
    created_at: string;
    team_id: string;
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

// Helper to validate date strings
export const isValidProjectDate = (dateStr: string | null): dateStr is string => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
};

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
    startDate: isValidProjectDate(task.start_date) ? task.start_date : null,
    endDate: isValidProjectDate(task.end_date) ? task.end_date : null,
    actualCompletionDate: isValidProjectDate(task.actual_completion_date) ? task.actual_completion_date : null,
    includeSaturday: task.include_saturday || false,
    includeSunday: task.include_sunday || false,
    actualStartDate: isValidProjectDate(task.actual_start_date) ? task.actual_start_date : null,
    actualEndDate: isValidProjectDate(task.actual_end_date) ? task.actual_end_date : null,
    startTime: task.start_time || '09:30',
    endTime: task.end_time || '18:30',
    completedAt: isValidProjectDate(task.completed_at) ? task.completed_at : null,
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
    createdAt: isValidProjectDate(task.created_at) ? task.created_at : new Date().toISOString(),
    teamId: (task as any).team_id
});

export const mapProjectFromDB = (project: DBProject): Project => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    hubstaffId: project.hubstaff_id,
    createdAt: isValidProjectDate(project.created_at) ? project.created_at : new Date().toISOString(),
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

    // Set end of work day to 6:30 PM IST on the end date for ACTIVE check
    const endOfWorkDay = new Date(endDate);
    endOfWorkDay.setHours(18, 30, 0, 0);

    // Set end of absolute day (11:59:59 PM) for COMPLETED check
    // User requested lenient check: if completed "before today 11.59 PM" it's not overdue.
    const endOfAbsoluteDay = new Date(endDate);
    endOfAbsoluteDay.setHours(23, 59, 59, 999);

    // For completed tasks, check if they were completed AFTER the due date (allowing same-day completion)
    if (s === 'completed') {
        // Try to get completion timestamp from completedAt or actualCompletionDate
        const completionTimestamp = task.completedAt || task.actualCompletionDate;

        if (!completionTimestamp) {
            // No completion timestamp available - assume completed on time
            return false;
        }

        const completedDate = new Date(completionTimestamp);

        // Task is overdue if it was completed AFTER the end of the due date (11:59 PM)
        return completedDate > endOfAbsoluteDay;
    }

    // For active tasks, check if current time is past 6:30 PM on the end date
    // 1. Create a UTC date for "Now" adjusted to IST
    const istNow = getISTDate();

    // 2. Create the deadline: 6:30 PM IST on the End Date
    // Parse YYYY-MM-DD
    const [y, m, d] = task.endDate.split('-').map(Number);
    // Construct a Date object that Represents 18:30 IST
    // 18:30 IST = 13:00 UTC (18.5 - 5.5)
    // We want to compare the "shifted" istNow with a "shifted" deadline.
    // If istNow is shifted +5.5h, then 18:30 IST should be represented as... 18:30.
    // Let's use the same logic as getISTDate:
    // Create a date at 18:30 UTC, and then pretend it's IST? No.

    // Better Approach: Convert everything to absolute UTC timestamps for comparison.

    // Deadline: 18:30 IST on YYYY-MM-DD
    // = YYYY-MM-DD T 13:00:00 UTC
    const deadlineUTC = new Date(Date.UTC(y, m - 1, d, 13, 0, 0)); // 13:00 UTC = 18:30 IST

    // Current Time: Absolute UTC
    const nowUTC = new Date();

    return nowUTC > deadlineUTC;
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

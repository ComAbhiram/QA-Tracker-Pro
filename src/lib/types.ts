
export interface DBTask {
    id: number;
    project_name: string;
    sub_phase: string | null;
    pc: string | null;
    assigned_to: string | null;
    assigned_to2: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    include_saturday: boolean | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    completed_at: string | null;
    comments: string | null;
    bug_count: number | null;
    html_bugs: number | null;
    functional_bugs: number | null;
    deviation_reason: string | null;
    sprint: string | null;
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
    subPhase: string | null;
    pc: string | null;
    assignedTo: string | null;
    assignedTo2: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    includeSaturday: boolean;
    actualStartDate: string | null;
    actualEndDate: string | null;
    startTime: string | null;
    endTime: string | null;
    completedAt: string | null;
    comments: string | null;
    bugCount: number;
    htmlBugs: number;
    functionalBugs: number;
    deviationReason: string | null;
    sprint: string | null;
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
    projectName: task.project_name,
    subPhase: task.sub_phase,
    pc: task.pc,
    assignedTo: task.assigned_to,
    assignedTo2: task.assigned_to2,
    status: task.status || 'In Progress',
    startDate: task.start_date,
    endDate: task.end_date,
    includeSaturday: task.include_saturday || false,
    actualStartDate: task.actual_start_date,
    actualEndDate: task.actual_end_date,
    startTime: task.start_time || '09:30',
    endTime: task.end_time || '18:30',
    completedAt: task.completed_at,
    comments: task.comments,
    bugCount: task.bug_count || 0,
    htmlBugs: task.html_bugs || 0,
    functionalBugs: task.functional_bugs || 0,
    deviationReason: task.deviation_reason,
    sprint: task.sprint,
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

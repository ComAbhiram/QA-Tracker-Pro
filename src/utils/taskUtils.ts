import { Task } from '@/lib/types';

export function getEffectiveStatus(task: Task): string {
    if (!task) return 'Unknown';

    // Ensure status is a string and trimmed
    const status = (task.status || 'Unknown').trim();

    // If the status is already a terminal or paused state, return it as is.
    const terminalStatuses = ['Completed', 'Rejected', 'On Hold', 'Forecast'];
    if (terminalStatuses.includes(status)) {
        return status;
    }

    if (!task.endDate) {
        return status;
    }

    // Parse end date and set deadline time to 18:30:00 (6:30 PM)
    const endDate = new Date(task.endDate);
    const deadline = new Date(endDate);
    deadline.setHours(18, 30, 0, 0);

    const now = new Date();

    if (now > deadline) {
        return 'Overdue';
    }

    return status;
}

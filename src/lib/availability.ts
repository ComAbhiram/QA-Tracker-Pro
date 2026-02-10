import { Task, Leave } from '@/lib/types';
import { addDays } from 'date-fns';

export function calculateAvailability(tasks: Task[], leaves: Leave[]): Date {
    // 1. Find max end date from active tasks
    let maxTaskEnd = new Date();
    maxTaskEnd.setHours(0, 0, 0, 0);

    tasks.forEach(task => { // Use all tasks passed to it (which should be active ones)
        if (task.endDate) {
            const end = new Date(task.endDate);
            end.setHours(0, 0, 0, 0);
            if (end > maxTaskEnd) maxTaskEnd = end;
        }
    });

    // Initial availability is next day after max task end
    let availableFrom = addDays(maxTaskEnd, 1);

    // 2. Adjust for leaves
    // Sort leaves by date ascending
    const sortedLeaves = [...leaves].sort((a, b) => new Date(a.leave_date).getTime() - new Date(b.leave_date).getTime());

    let isChecking = true;
    while (isChecking) {
        const dateStr = availableFrom.toISOString().split('T')[0];
        const hasLeave = sortedLeaves.some(l => l.leave_date === dateStr);

        if (hasLeave) {
            availableFrom = addDays(availableFrom, 1);
        } else {
            isChecking = false;
        }
    }

    return availableFrom;
}


function getISTDate() {
    const now = new Date(); // This will use system time. We might need to mock this.
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    return new Date(utcTime + istOffset);
}

function isTaskOverdue(task, mockNow) {
    // Rejected tasks are never overdue
    const s = (task.status || '').toLowerCase();
    if (s === 'rejected') return false;
    if (!task.endDate) return false;

    const endDate = new Date(task.endDate);

    // Set end of work day to 6:30 PM IST on the end date for ACTIVE check
    const endOfWorkDay = new Date(endDate);
    endOfWorkDay.setHours(18, 30, 0, 0);

    // Set end of absolute day (11:59:59 PM) for COMPLETED check
    const endOfAbsoluteDay = new Date(endDate);
    endOfAbsoluteDay.setHours(23, 59, 59, 999);

    if (s === 'completed') {
        const completionTimestamp = task.completedAt || task.actualCompletionDate;
        if (!completionTimestamp) {
            return false;
        }
        const completedDate = new Date(completionTimestamp);
        return completedDate > endOfAbsoluteDay;
    }

    // For active tasks
    // If we pass a mockNow, use it, otherwise call getISTDate
    const istNow = mockNow || getISTDate();

    console.log('--- Debug Info ---');
    console.log('Task End Date Str:', task.endDate);
    console.log('Task End Date Obj:', endDate.toISOString());
    console.log('End of Work Day (18:30):', endOfWorkDay.toISOString());
    console.log('IST Now:', istNow.toISOString());
    console.log('Comparison (Now > EndOfWork):', istNow > endOfWorkDay);
    console.log('------------------');

    return istNow > endOfWorkDay;
}

// SIMULATION
// User says: Today is Feb 10 2026, 10:39 AM IST.
// Let's create a date that represents this "IST Now"
// 10:39 AM IST 
// If we use the getISTDate logic, we want the resulting Date object to have internal time matching 10:39 AM.
const mockISTNow = new Date('2026-02-10T10:39:00');

const activeTask = {
    status: 'In Progress',
    endDate: '2026-02-10'
};

console.log('Is Active Task Overdue?', isTaskOverdue(activeTask, mockISTNow));

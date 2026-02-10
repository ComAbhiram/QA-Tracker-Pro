
// Mocking getISTDate as it appears in the codebase
function getISTDate() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); // This attempts to get UTC timestamp
    // CAUTION: new Date().getTime() IS ALREADY UTC.
    // now.getTimezoneOffset() returns minutes difference between Local and UTC.
    // If local is UTC, offset is 0.
    // If local is IST, offset is -330.

    // Let's look at the implementation again:
    // const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    // If I am in IST (GMT+5:30). getTime() is X. offset is -330 (-5.5h).
    // X + (-5.5h) = UTC time? No.
    // getTime() is absolute UTC ms. 
    // The intention of this line `now.getTime() + (now.getTimezoneOffset()...)` is usually to get a timestamp that, when passed to new Date(), creates a date object whose *local representation* looks like UTC?
    // Actually, `new Date(timestamp)` creates a date from epoch.

    // Let's just trust the code does "shift" the time.
    return new Date(now.getTime() + istOffset); // Simplified for simulation if we assume environment is UTC
}

function check(taskEndDate, currentSystemTimeISO) {
    const task = { endDate: taskEndDate, status: 'In Progress' };

    // 1. Task End Date
    const endDate = new Date(task.endDate);

    // 2. End of Work Day
    const endOfWorkDay = new Date(endDate);
    endOfWorkDay.setHours(18, 30, 0, 0);

    // 3. Current IST Time (Simulated)
    // We want to simulate that "Now" is Feb 10, 10:39 AM IST.
    // If the system thinks it is 10:39 AM IST, then `getISTDate()` should return a Date object representing that.
    const istNow = new Date(currentSystemTimeISO);

    console.log(`\n--- Scenario: System Time ${currentSystemTimeISO} ---`);
    console.log('EndDate:', endDate.toISOString());
    console.log('EndOfWorkDay (created from EndDate, then setHours(18,30)):', endOfWorkDay.toISOString());
    console.log('IST Now:', istNow.toISOString());
    console.log('Is Overdue (IST Now > EndOfWorkDay)?', istNow > endOfWorkDay);
}

// Case A: System is UTC. 
// User says "Today is Feb 10".
// task.endDate = "2026-02-10".
// In UTC, new Date("2026-02-10") is 2026-02-10T00:00:00Z.
// setHours(18, 30) -> 2026-02-10T18:30:00Z.
// User says "Now is 10:39 AM IST".
// 10:39 AM IST is 05:09 AM UTC.
// If the server time is 05:09 AM UTC.
// getISTDate logic: now (05:09) + 5.5h = 10:39.
// So istNow becomes 2026-02-10T10:39:00Z (shifted).
// Comparison: 10:39Z > 18:30Z ? False.

// Case B: System is IST (already).
// task.endDate = "2026-02-10". 
// In IST, new Date("2026-02-10") is 2026-02-10T00:00:00+05:30 (midnight IST).
// setHours(18, 30) -> 2026-02-10T18:30:00+05:30.
// Now is 10:39 AM IST.
// istNow (shifted?) -> If system is IST, getISTDate shifts it FURTHER?
// If getISTDate adds 5.5h to already IST... 10:39 + 5.5 = 16:09.
// 16:09 > 18:30? False.

// Wait, what if the user's browser is in a timezone BEHIND UTC? (e.g. US).
// new Date("2026-02-10") -> Feb 9 19:00 EST. 
// setHours(18, 30) -> Feb 9 18:30 EST.
// IST Now (shifted 10:39 AM same day) -> Feb 10 10:39.
// Feb 10 10:39 > Feb 9 18:30? TRUE!

// HYPOTHESIS: The user's browser (client-side) is in a Western timezone (e.g. UTC, GMT, or US).
// But `task.endDate` (YYYY-MM-DD) is parsed as UTC midnight.
// If the browser is in a standard timezone, `new Date("2026-02-10")` is UTC midnight.
// `setHours(18, 30)` sets it to 18:30 LOCAL time?? No, sets it to 18:30 of the Date object's current representation?
// `Date.prototype.setHours` uses LOCAL time.
// If I am in UTC. `2026-02-10T00:00Z`. setHours(18) -> `2026-02-10T18:00Z`.
// If I am in PST (UTC-8).
// `new Date("2026-02-10")` -> `2026-02-10T00:00:00Z` (This is standard ISO parsing).
// Printed in PST: Feb 9, 4:00 PM.
// `setHours(18, 30)`. 
// Sets local hour to 18:30.
// Result: Feb 9, 18:30 PST.
// Which is Feb 10, 02:30 UTC.
// IST Now (shifted) is 10:39 (represented as UTC-like timestamp).
// 10:39 > 02:30? TRUE.
// OVERDUE!

// Fix: We must operate entirely in UTC or explicitly handle timezones without relying on `setHours` which uses local system time.
// We should parse YYYY-MM-DD, construct a specific Date object at 18:30 IST, and convert that to a timestamp for comparison.

// Let's verify this hypothesis.
console.log('Verification Logic:');

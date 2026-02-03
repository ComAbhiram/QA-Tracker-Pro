// Hubstaff Team Mapping Configuration
// This file maps Hubstaff users to their respective teams

export interface TeamMapping {
    [userId: string]: 'Design' | 'FE Dev' | 'BE Dev' | 'Testing';
}

// Map Hubstaff user names to teams
// Update this mapping based on your actual team structure
export const userNameToTeam: Record<string, 'Design' | 'FE Dev' | 'BE Dev' | 'Testing'> = {
    // Design Team
    'design': 'Design',
    'designer': 'Design',
    'ui': 'Design',
    'ux': 'Design',

    // Frontend Development Team
    'frontend': 'FE Dev',
    'fe dev': 'FE Dev',
    'react': 'FE Dev',
    'vue': 'FE Dev',
    'angular': 'FE Dev',

    // Backend Development Team
    'backend': 'BE Dev',
    'be dev': 'BE Dev',
    'node': 'BE Dev',
    'python': 'BE Dev',
    'java': 'BE Dev',

    // Testing/QA Team
    'qa': 'Testing',
    'test': 'Testing',
    'testing': 'Testing',
    'quality': 'Testing',
};

// Determine team based on user information
export function determineUserTeam(user: any): 'Design' | 'FE Dev' | 'BE Dev' | 'Testing' | 'Unknown' {
    const userName = (user.name || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    // Check exact matches first
    for (const [keyword, team] of Object.entries(userNameToTeam)) {
        if (userName.includes(keyword) || role.includes(keyword) || email.includes(keyword)) {
            return team;
        }
    }

    // Check for common patterns
    if (userName.includes('aswathi') || userName.includes('sreegith') || userName.includes('abhiram')) {
        return 'Testing'; // Known QA members
    }

    // Default fallback
    return 'Unknown';
}

// Map team to display name
export function getTeamDisplayName(team: string): string {
    const teamNames: Record<string, string> = {
        'Design': 'Design',
        'FE Dev': 'Frontend Development',
        'BE Dev': 'Backend Development',
        'Testing': 'QA & Testing',
        'Unknown': 'Unassigned'
    };
    return teamNames[team] || team;
}

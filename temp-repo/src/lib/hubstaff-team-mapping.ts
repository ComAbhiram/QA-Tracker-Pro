// Hubstaff Team Mapping Configuration
// This file maps Hubstaff users to their respective teams

export interface TeamMapping {
    [userId: string]: 'Design' | 'FE Dev' | 'BE Dev' | 'Testing';
}

// Map Hubstaff user names to teams
// Explicit list provided by the user
export const userNameToTeam: Record<string, 'Design' | 'FE Dev' | 'BE Dev' | 'Testing'> = {
    // BE Dev
    'akhila mohanan': 'BE Dev',
    'manu k o': 'BE Dev',
    'priya k': 'BE Dev',
    'ramees nuhman': 'BE Dev',
    'sooryajith p': 'BE Dev',
    'suchith lal': 'BE Dev',
    'bijith p n': 'BE Dev',
    'joshua johnson': 'BE Dev',
    'mohammed afsal': 'BE Dev',
    'nikhil govind': 'BE Dev',
    'sejal sebastian': 'BE Dev',
    'vaishnav vijayan': 'BE Dev',
    'amrutha lakshmi': 'BE Dev',
    'deepu nr': 'BE Dev',
    'jishnu v gopal': 'BE Dev',
    'sonu sivaraman': 'BE Dev',

    // Design
    'alfiya noori': 'Design',
    'justin jose': 'Design',
    'kiran p s': 'Design',
    'neethu shaji': 'Design',

    // FE Dev
    'abish': 'FE Dev',
    'ajay': 'FE Dev',
    'amrutha ms': 'FE Dev',
    'josin joseph': 'FE Dev',
    'sahad rahman': 'FE Dev',
    'samir mulashiya': 'FE Dev',
    'sreegith va': 'FE Dev',
    'sunil anurudhan': 'FE Dev',
    'vishal ramesh': 'FE Dev',
    'vishnu shaji': 'FE Dev',

    // Testing
    'aswathi m ashok': 'Testing'
};

// Determine team based on user information
export function determineUserTeam(user: any): 'Design' | 'FE Dev' | 'BE Dev' | 'Testing' | 'Unknown' {
    const userName = (user.name || '').toLowerCase().trim();

    // Check exact matches in the provided list
    if (userNameToTeam[userName]) {
        return userNameToTeam[userName];
    }

    // Keyword fallback for others
    const keywords: Record<string, 'Design' | 'FE Dev' | 'BE Dev' | 'Testing'> = {
        'design': 'Design',
        'frontend': 'FE Dev',
        'backend': 'BE Dev',
        'qa': 'Testing',
        'testing': 'Testing'
    };

    for (const [keyword, team] of Object.entries(keywords)) {
        if (userName.includes(keyword)) {
            return team;
        }
    }

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

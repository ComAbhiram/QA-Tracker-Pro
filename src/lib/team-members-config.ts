// Team members configuration for HR Daily Report
// Only these members will be shown in the HR report, grouped by department
// Names MUST match exactly as they appear in Hubstaff

export interface TeamMemberConfig {
    name: string;
    hubstaffName: string; // EXACT full name in Hubstaff
    department: 'DESIGNERS' | 'QA' | 'PHP' | 'APP' | 'WPD';
}

export const TEAM_MEMBERS: TeamMemberConfig[] = [
    // DESIGNERS
    { name: 'Justin', hubstaffName: 'Justin Jose', department: 'DESIGNERS' },
    { name: 'Kiran', hubstaffName: 'Kiran P S', department: 'DESIGNERS' },
    { name: 'Alfiya', hubstaffName: 'Alfiya Noori', department: 'DESIGNERS' },
    { name: 'Neethu', hubstaffName: 'Neethu', department: 'DESIGNERS' }, // Need to verify
    { name: 'Nikitha', hubstaffName: 'Nikitha', department: 'DESIGNERS' }, // Need to verify

    // QA
    { name: 'Aswathi', hubstaffName: 'Aswathi M Ashok', department: 'QA' },
    { name: 'Minnu', hubstaffName: 'Minnu Sebastian', department: 'QA' },

    // PHP
    { name: 'Josin', hubstaffName: 'Josin Joseph', department: 'PHP' },
    { name: 'Ammu', hubstaffName: 'Ammu', department: 'PHP' }, // Need to verify
    { name: 'Akhila', hubstaffName: 'Akhila Mohanan', department: 'PHP' },
    { name: 'Sreeji', hubstaffName: 'Sreeji', department: 'PHP' }, // Need to verify
    { name: 'Suchith', hubstaffName: 'Suchith', department: 'PHP' }, // Need to verify
    { name: 'Priya', hubstaffName: 'Priya', department: 'PHP' }, // Need to verify
    { name: 'Amrutha', hubstaffName: 'Amrutha lakshmi', department: 'PHP' },
    { name: 'Abish', hubstaffName: 'Abish', department: 'PHP' },
    { name: 'Sajin', hubstaffName: 'Sajin', department: 'PHP' }, // Need to verify

    // APP
    { name: 'Vaishnav', hubstaffName: 'Vaishnav', department: 'APP' }, // Need to verify
    { name: 'Ajay', hubstaffName: 'Ajay', department: 'APP' },
    { name: 'Joshua', hubstaffName: 'Joshua Johnson', department: 'APP' },
    { name: 'Bijith', hubstaffName: 'Bijith P N', department: 'APP' },
    { name: 'Nikhil', hubstaffName: 'Nikhil', department: 'APP' }, // Need to verify
    { name: 'Sejal', hubstaffName: 'Sejal', department: 'APP' }, // Need to verify

    // WPD
    { name: 'Hasna', hubstaffName: 'Hasna', department: 'WPD' }, // Need to verify
    { name: 'Deepu', hubstaffName: 'Deepu Nr', department: 'WPD' },
    { name: 'Sonu', hubstaffName: 'Sonu', department: 'WPD' }, // Need to verify
    { name: 'Jishnu', hubstaffName: 'Jishnu V Gopal', department: 'WPD' },
];

export function getTeamMemberByHubstaffName(hubstaffName: string): TeamMemberConfig | undefined {
    return TEAM_MEMBERS.find(m => m.hubstaffName === hubstaffName);
}

export function getTeamMembersByDepartment(department: TeamMemberConfig['department']): TeamMemberConfig[] {
    return TEAM_MEMBERS.filter(m => m.department === department);
}

export const DEPARTMENTS: TeamMemberConfig['department'][] = ['DESIGNERS', 'PHP', 'APP', 'WPD', 'QA'];

// QA members only (for Today's Work Status)
export const QA_MEMBERS = TEAM_MEMBERS.filter(m => m.department === 'QA');

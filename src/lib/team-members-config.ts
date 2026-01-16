// Team members configuration for HR Daily Report
// Only these members will be shown in the HR report, grouped by department
// Names MUST match exactly as they appear in Hubstaff

export interface TeamMemberConfig {
    name: string;
    hubstaffName: string; // EXACT full name in Hubstaff
    department: 'DESIGNERS' | 'QA' | 'PHP' | 'HTML' | 'APP' | 'WPD';
}

export const TEAM_MEMBERS: TeamMemberConfig[] = [
    // DESIGNERS
    { name: 'Justin', hubstaffName: 'Justin Jose', department: 'DESIGNERS' },
    { name: 'Kiran', hubstaffName: 'Kiran P S', department: 'DESIGNERS' },
    { name: 'Alfiya', hubstaffName: 'Alfiya Noori', department: 'DESIGNERS' },
    { name: 'Neethu', hubstaffName: 'Neethu Shaji', department: 'DESIGNERS' },
    { name: 'Nikitha', hubstaffName: 'SKIP_HUBSTAFF_NIKITHA', department: 'DESIGNERS' },

    // PHP
    { name: 'Akhila', hubstaffName: 'Akhila Mohanan', department: 'PHP' },
    { name: 'Ramees', hubstaffName: 'Ramees Nuhman', department: 'PHP' },
    { name: 'Suchith', hubstaffName: 'Suchith Lal', department: 'PHP' },
    { name: 'Priya', hubstaffName: 'Priya K', department: 'PHP' },

    // HTML
    { name: 'Josin', hubstaffName: 'Josin Joseph', department: 'HTML' },
    { name: 'Vishnu', hubstaffName: 'Vishnu shaji', department: 'HTML' },
    { name: 'Ajay', hubstaffName: 'Ajay', department: 'HTML' },
    { name: 'Sreegith', hubstaffName: 'Sreegith VA', department: 'HTML' },
    { name: 'Amrutha', hubstaffName: 'amrutha ms', department: 'HTML' },
    { name: 'Abish', hubstaffName: 'Abish', department: 'HTML' },
    { name: 'Samir', hubstaffName: 'SKIP_HUBSTAFF_SAMIR', department: 'HTML' },

    // APP
    { name: 'Vaishnav', hubstaffName: 'Vaishnav Vijayan', department: 'APP' },
    { name: 'Afsal', hubstaffName: 'Mohammed Afsal', department: 'APP' },
    { name: 'Joshua', hubstaffName: 'Joshua Johnson', department: 'APP' },
    { name: 'Bijith', hubstaffName: 'Bijith P N', department: 'APP' },
    { name: 'Nikhil', hubstaffName: 'Nikhil Govind', department: 'APP' },
    { name: 'Sejal', hubstaffName: 'Sejal Sebastian', department: 'APP' },

    // WPD
    { name: 'Deepu', hubstaffName: 'Deepu Nr', department: 'WPD' },
    { name: 'Sonu', hubstaffName: 'Sonu Sivaraman', department: 'WPD' },
    { name: 'Jishnu', hubstaffName: 'Jishnu V Gopal', department: 'WPD' },
    { name: 'Hasna', hubstaffName: 'SKIP_HUBSTAFF_HASNA', department: 'WPD' },

    // QA
    { name: 'Aswathi', hubstaffName: 'Aswathi M Ashok', department: 'QA' },
    { name: 'Minnu', hubstaffName: 'Minnu Sebastian', department: 'QA' },

];

export function getTeamMemberByHubstaffName(hubstaffName: string): TeamMemberConfig | undefined {
    if (!hubstaffName) return undefined;
    return TEAM_MEMBERS.find(m => m.hubstaffName.toLowerCase() === hubstaffName.toLowerCase());
}

export function getTeamMembersByDepartment(department: TeamMemberConfig['department']): TeamMemberConfig[] {
    return TEAM_MEMBERS.filter(m => m.department === department);
}

export const DEPARTMENTS: TeamMemberConfig['department'][] = ['DESIGNERS', 'PHP', 'HTML', 'APP', 'WPD', 'QA'];

// QA members only (for Today's Work Status)
export const QA_MEMBERS = TEAM_MEMBERS.filter(m => m.department === 'QA');

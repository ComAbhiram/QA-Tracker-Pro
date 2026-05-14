// Hubstaff name to QA name mapping
export const HUBSTAFF_TO_QA_NAME_MAP: Record<string, string> = {
    'Aswathi M Ashok': 'Aswathi',
    'Minnu Sebastian': 'Minnu',
    'Justin Jose': 'Justin',
    'Kiran P S': 'Kiran',
    'Alfiya Noori': 'Alfiya',
    'Neethu Shaji': 'Neethu',
    'Akhila Mohanan': 'Akhila',
    'Akhila Mohan': 'Akhila',
    'Ramees Nuhman': 'Ramees',
    'Josin Joseph': 'Josin',
    'Sreegith VA': 'Sreegith',
    'Samir Mulashiya': 'Samir',
    'Amrutha lakshmi': 'Amrutha',
    'amrutha ms': 'Amrutha',
    'Vishnu': 'Vishnu', // Self-mapping if needed or handle case sensitivity
    'Vishnu Shaji': 'Vishnu',
    'Vishnu shaji': 'Vishnu',
    'Jishnu V Gopal': 'Jishnu',
    'Sayooj K': 'Sayooj',
    'Sayooj': 'Sayooj',
    'Abhiram': 'Abhiram',
    'Abhiram P Mohan': 'Abhiram',
};

/**
 * Map a Hubstaff user name to the corresponding QA name
 * @param hubstaffName - Full name from Hubstaff (e.g., "Aswathi M Ashok")
 * @returns Mapped QA name (e.g., "Aswathi") or original name if no mapping exists
 */
export function mapHubstaffNameToQA(hubstaffName: string): string {
    return HUBSTAFF_TO_QA_NAME_MAP[hubstaffName] || hubstaffName;
}

/**
 * Get QA name from Hubstaff name, falling back to first name if no mapping exists
 * @param hubstaffName - Full name from Hubstaff
 * @returns Mapped QA name or first name
 */
export function getQANameFromHubstaff(hubstaffName: string): string {
    return HUBSTAFF_TO_QA_NAME_MAP[hubstaffName] || hubstaffName.split(' ')[0];
}

/**
 * Get Hubstaff name from QA name (reverse lookup)
 * @param qaName - QA name (e.g., "Aswathi")
 * @returns Hubstaff full name or null if not found
 */
export function getHubstaffNameFromQA(qaName: string): string | null {
    // Priority 1: If the input name already matches a key that maps to itself, keep it (Identity mapping)
    if (HUBSTAFF_TO_QA_NAME_MAP[qaName] === qaName) {
        return qaName;
    }

    // Priority 2: Standard reverse lookup (first found)
    const entry = Object.entries(HUBSTAFF_TO_QA_NAME_MAP).find(([_, qa]) => qa === qaName);
    return entry ? entry[0] : null;
}

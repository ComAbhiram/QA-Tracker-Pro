const userNameToTeam = {
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

function determineUserTeam(user) {
    const userName = (user.name || '').toLowerCase().trim();

    // Check exact matches in the provided list
    if (userNameToTeam[userName]) {
        return userNameToTeam[userName];
    }

    // Keyword fallback for others
    const keywords = {
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

const testUsers = [
    { name: 'akhila mohanan' },
    { name: 'Akhila Mohanan' },
    { name: 'Manu K O' },
    { name: 'Unknown User' },
    { name: 'Frontend Dev' },
    { name: 'QA Tester' }
];

console.log('Testing determineUserTeam:');
testUsers.forEach(user => {
    const team = determineUserTeam(user);
    console.log(`User: "${user.name}" -> Team: ${team}`);
});

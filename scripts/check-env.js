require('dotenv').config({ path: '.env.local' });

const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SMTP_USER',
    'SMTP_PASS'
];

console.log('Environment Variable Status:');
keys.forEach(key => {
    const value = process.env[key];
    console.log(`${key}: ${value ? 'Present (Length: ' + value.length + ')' : 'MISSING'}`);
});

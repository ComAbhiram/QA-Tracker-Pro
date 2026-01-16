
import dotenv from 'dotenv';
import path from 'path';

// Load env FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('Testing Hubstaff Auth...');
    try {
        // Dynamic import after env is loaded
        const { getValidAccessToken } = await import('../src/lib/hubstaff-auth');

        const token = await getValidAccessToken();
        if (token) {
            console.log('SUCCESS: Obtained valid access token:', token.substring(0, 10) + '...');
        } else {
            console.error('FAILURE: Could not obtain access token.');
        }
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    }
}

main();

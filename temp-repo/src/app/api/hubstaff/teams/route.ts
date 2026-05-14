import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Predefined teams based on hubstaff-team-mapping.ts
const TEAMS = [
    'QA Developers',
    'Backend Developers',
    'Frontend Developers',
    'Designers',
    'Unknown'
];

export async function GET() {
    try {
        return NextResponse.json({ teams: TEAMS });
    } catch (error: any) {
        console.error('Error fetching teams:', error);
        return NextResponse.json(
            { error: 'Failed to fetch teams', message: error.message },
            { status: 500 }
        );
    }
}

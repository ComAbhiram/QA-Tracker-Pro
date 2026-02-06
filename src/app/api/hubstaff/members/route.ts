import { NextResponse } from 'next/server';
import { hubstaffClient } from '@/lib/hubstaff-client';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[API] Fetching members...');
        const members = await hubstaffClient.getOrganizationMembers();
        return NextResponse.json({ members });
    } catch (error: any) {
        console.error('Error in /api/hubstaff/members:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch Hubstaff members' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const { passkey } = await request.json();

        // Validate passkey
        if (passkey !== 'inter223') {
            return NextResponse.json({ error: 'Invalid passkey' }, { status: 401 });
        }

        // Set manager session cookie
        const cookieStore = cookies();

        // Set a secure manager token
        cookieStore.set('manager_session', 'active', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Also set the guest token for client-side detection
        cookieStore.set('guest_token', 'manager_access_token_2026', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Manager login error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

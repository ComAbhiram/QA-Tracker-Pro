import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const { passkey } = await request.json();

        // Validate passkey
        if (passkey !== 'inter224') {
            return NextResponse.json({ error: 'Invalid passkey' }, { status: 401 });
        }

        // Set PC mode session cookies
        const cookieStore = cookies();

        // Set a secure PC mode token (httpOnly so API routes can check it)
        cookieStore.set('pc_mode_session', 'active', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Set the manager session too so API routes allow data access
        cookieStore.set('manager_session', 'active', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        });

        // Set guest token for client-side detection (same as manager mode)
        cookieStore.set('guest_token', 'manager_access_token_2026', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        });

        // Set PC mode token for client-side detection (read-only flag)
        cookieStore.set('pc_mode_token', 'pc_read_only_2026', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('PC login error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

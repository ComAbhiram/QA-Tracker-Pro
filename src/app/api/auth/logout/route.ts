import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = cookies();
        
        // Clear all possible custom session cookies
        const cookiesToClear = [
            'manager_session',
            'pc_mode_session',
            'guest_mode',
            'guest_token',
            'pc_mode_token'
        ];

        for (const cookieName of cookiesToClear) {
            cookieStore.delete(cookieName);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

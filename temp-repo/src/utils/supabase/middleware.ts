import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Check guest/manager/PC mode FIRST before any Supabase calls
    // These are set server-side by the login API routes
    const isGuestMode = request.cookies.get('guest_mode')?.value === 'true'
    const hasManagerSession = request.cookies.get('manager_session')?.value === 'active'
    const isGuestPath = request.nextUrl.pathname.startsWith('/guest')
    const isLoginPath = request.nextUrl.pathname.startsWith('/login')
    const isAuthPath = request.nextUrl.pathname.startsWith('/auth')

    // Allow public assets without any auth check
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('favicon.ico') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/supabase-proxy')
    ) {
        return response
    }

    // Guest/Manager/PC mode: allow access to all pages (except redirect away from login)
    if (isGuestMode || hasManagerSession) {
        if (isLoginPath) {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
        return response
    }

    // For regular Supabase auth users, validate the session
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Force 30 days expiration on all auth cookies
                    const maxAge = 30 * 24 * 60 * 60; // 30 days

                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })

                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })

                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, {
                            ...options,
                            maxAge,
                            sameSite: 'lax',
                        })
                    )
                },
            },
        }
    )

    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data?.user
    } catch (err) {
        // Swallow network/DNS errors to prevent accidental logouts
        console.error('Middleware: getUser() failed (possible network issue):', err)
    }

    // Protect routes
    // 1. If not logged in and not in guest mode and not on login/guest page, redirect to login
    if (!user && !isGuestMode && !isLoginPath && !isGuestPath && !isAuthPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If logged in (not guest) and on login page, redirect to home
    if (user && !isGuestMode && isLoginPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}

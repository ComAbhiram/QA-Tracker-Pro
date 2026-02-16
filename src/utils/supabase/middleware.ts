import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

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

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Check if user is in guest mode via cookie
    const isGuestMode = request.cookies.get('guest_mode')?.value === 'true'
    const isGuestPath = request.nextUrl.pathname.startsWith('/guest')
    const isLoginPath = request.nextUrl.pathname.startsWith('/login')
    const isAuthPath = request.nextUrl.pathname.startsWith('/auth')

    // Protect routes
    // 1. If not logged in and not in guest mode and not on login/guest page, redirect to login
    if (!user && !isGuestMode && !isLoginPath && !isGuestPath && !isAuthPath) {
        // Allow public assets
        if (request.nextUrl.pathname.startsWith('/_next') ||
            request.nextUrl.pathname.includes('favicon.ico') ||
            request.nextUrl.pathname.startsWith('/api')
        ) {
            return response
        }

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

    // 3. If in guest mode and on login page, redirect to home
    if (isGuestMode && isLoginPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}

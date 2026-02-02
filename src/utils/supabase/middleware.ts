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
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Check if user is in guest mode (client-side localStorage check will be done in components)
    // For middleware, we'll allow access to all routes if they're on /guest or have accessed it
    const isGuestPath = request.nextUrl.pathname.startsWith('/guest')

    // Protect routes
    // 1. If not logged in and not on login/guest page, redirect to login
    if (!user && !request.nextUrl.pathname.startsWith('/login') && !isGuestPath && !request.nextUrl.pathname.startsWith('/auth')) {
        // Allow public assets
        if (request.nextUrl.pathname.startsWith('/_next') ||
            request.nextUrl.pathname.includes('favicon.ico') ||
            request.nextUrl.pathname.startsWith('/api') // Allow API for now (API routes will handle their own auth)
        ) {
            return response
        }

        // Allow access if coming from guest mode (we'll rely on client-side checks)
        // This is a simplified approach - in production, you might want to use a cookie
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If logged in and on login page, redirect to home
    if (user && request.nextUrl.pathname.startsWith('/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}

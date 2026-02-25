import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Headers to strip from the proxied request (Next.js adds these)
const STRIP_REQUEST_HEADERS = new Set(['host', 'connection', 'transfer-encoding']);
// Headers to strip from the proxied response
const STRIP_RESPONSE_HEADERS = new Set(['transfer-encoding', 'connection']);

async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path.join('/');
    const search = request.nextUrl.search;
    const targetUrl = `${SUPABASE_URL}/${path}${search}`;

    // Build forwarded headers (strip problematic ones)
    const forwardedHeaders = new Headers();
    request.headers.forEach((value, key) => {
        if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
            forwardedHeaders.set(key, value);
        }
    });

    // Read body for non-GET/HEAD requests
    let body: BodyInit | null = null;
    const method = request.method;
    if (method !== 'GET' && method !== 'HEAD') {
        body = await request.arrayBuffer();
    }

    try {
        const response = await fetch(targetUrl, {
            method,
            headers: forwardedHeaders,
            body: body ?? undefined,
            // Don't follow redirects — pass them through to the client
            redirect: 'manual',
        });

        // Build response headers
        const responseHeaders = new Headers();
        response.headers.forEach((value, key) => {
            if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        });

        // Allow cookies from Supabase to be set in the browser
        responseHeaders.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');

        const responseBody = await response.arrayBuffer();

        return new NextResponse(responseBody, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error: any) {
        console.error('[supabase-proxy] Fetch failed:', error);
        return NextResponse.json(
            { error: 'Proxy error: ' + (error.message || 'Unknown error') },
            { status: 502 }
        );
    }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };

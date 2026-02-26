import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fallback if environment variables are missing (e.g. initial Vercel deploy before setup)
    if (!supabaseUrl || !supabaseKey) {
        console.warn("Supabase configuration is missing. Skipping auth checks.")
        return response
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Protected paths configuration
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
    const isLoginPage = request.nextUrl.pathname.startsWith('/login')
    const isPublicFile = request.nextUrl.pathname.includes('.')

    // 1. Basic Auth Check
    if (!user && !isLoginPage && !isPublicFile && request.nextUrl.pathname !== '/') {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. Role-Based Access Control (RBAC)
    if (user && isAdminPath) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            // Redirect non-admins away from admin pages
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // 3. Login Page Redirect
    if (user && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}

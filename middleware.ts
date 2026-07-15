/**
 * Supabase session-refresh middleware.
 *
 * CURRENTLY INACTIVE — the app runs as a static export (output: 'export')
 * which does not support Next.js middleware.
 *
 * TO ACTIVATE when switching to a server deployment:
 *   1. Remove `output: 'export'` from next.config.ts
 *   2. Uncomment the export below
 *   3. The middleware will refresh Supabase auth tokens on every navigation,
 *      preventing "session expired" errors on server-rendered pages
 *
 * import { createServerClient } from '@supabase/ssr'
 * import { NextResponse, type NextRequest } from 'next/server'
 *
 * export async function middleware(request: NextRequest) {
 *   let supabaseResponse = NextResponse.next({ request })
 *
 *   const supabase = createServerClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
 *     {
 *       cookies: {
 *         getAll() { return request.cookies.getAll() },
 *         setAll(cookiesToSet) {
 *           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
 *           supabaseResponse = NextResponse.next({ request })
 *           cookiesToSet.forEach(({ name, value, options }) =>
 *             supabaseResponse.cookies.set(name, value, options)
 *           )
 *         },
 *       },
 *     },
 *   )
 *
 *   // Refresh session — do NOT remove, required for Server Components
 *   await supabase.auth.getUser()
 *
 *   return supabaseResponse
 * }
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
 * }
 */

// Static export placeholder — no middleware needed
export {}

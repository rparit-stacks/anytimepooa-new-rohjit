import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip middleware for API routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    return supabaseResponse
  }

  // Check for session token
  const sessionToken = request.cookies.get("session_token")?.value
  const allCookies = request.cookies.getAll()
  const cookieHeader = request.headers.get("cookie")
  
  // Validate token format (should be UUID)
  const isValidTokenFormat = sessionToken ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionToken) : false
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("[MIDDLEWARE] 🚀 REQUEST RECEIVED")
  console.log("[MIDDLEWARE] Path:", request.nextUrl.pathname)
  console.log("[MIDDLEWARE] Method:", request.method)
  console.log("[MIDDLEWARE] Full URL:", request.url)
  console.log("[MIDDLEWARE] Session Token:", sessionToken ? `✅ EXISTS (${sessionToken.substring(0, 20)}...)` : "❌ MISSING")
  console.log("[MIDDLEWARE] Token Format Valid:", isValidTokenFormat ? "✅ YES" : "❌ NO")
  console.log("[MIDDLEWARE] All Cookies Count:", allCookies.length)
  console.log("[MIDDLEWARE] All Cookies:", allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`).join(", ") || "none")
  console.log("[MIDDLEWARE] Cookie Header Raw:", cookieHeader ? cookieHeader.substring(0, 200) + "..." : "❌ NONE")
  console.log("[MIDDLEWARE] User-Agent:", request.headers.get("user-agent")?.substring(0, 50))
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  
  // Check if we have a valid session token
  if (!sessionToken || !isValidTokenFormat) {
    if (!sessionToken) {
      console.log("[MIDDLEWARE] ⚠️  NO SESSION TOKEN FOUND")
    } else {
      console.log("[MIDDLEWARE] ⚠️  INVALID TOKEN FORMAT - Token does not match UUID format")
      // Clear invalid token cookie
      supabaseResponse.cookies.delete("session_token")
    }
    // No valid session token, check if route requires auth
    if (
      request.nextUrl.pathname !== "/" &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/sign-up")
    ) {
      console.log("[MIDDLEWARE] ❌ REDIRECTING TO LOGIN")
      console.log("[MIDDLEWARE] Reason: No valid session token for protected route")
      console.log("[MIDDLEWARE] From:", request.nextUrl.pathname)
      console.log("[MIDDLEWARE] To: /auth/login")
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      const redirectResponse = NextResponse.redirect(url)
      redirectResponse.cookies.delete("session_token")
      return redirectResponse
    }
    console.log("[MIDDLEWARE] ✅ Allowing public route without session")
    return supabaseResponse
  }
  
  console.log("[MIDDLEWARE] ✅ SESSION TOKEN FOUND, VERIFYING...")

  // Verify session token
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    // Query session - we'll log it separately below

    console.log(`[MIDDLEWARE] 🔍 QUERY START | Path: ${request.nextUrl.pathname} | Token: ${sessionToken.substring(0, 16)}...`)
    
    // Use maybeSingle() instead of single() to handle no rows gracefully
    // PGRST116 error occurs when .single() finds 0 rows - we want to handle this gracefully
    const sessionResult = await supabase
      .from("sessions")
      .select("*")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
    
    const session = sessionResult.data
    const error = sessionResult.error
    
    // Handle PGRST116 specifically (no rows found) - this is expected when session doesn't exist
    const isNoRowsError = error?.code === "PGRST116"
    
    // Force single line logs that will definitely show
    if (session && !isNoRowsError) {
      const isExpired = new Date(session.expires_at) < new Date()
      console.log(`[MIDDLEWARE] RESULT: SESSION_FOUND UserID=${session.user_id} Expired=${isExpired} Path=${request.nextUrl.pathname}`)
    } else {
      const errorCode = error?.code || "NONE"
      const errorMsg = isNoRowsError ? "SESSION_NOT_FOUND" : (error?.message || "NOT_FOUND")
      console.log(`[MIDDLEWARE] RESULT: NO_SESSION ErrorCode=${errorCode} ErrorMsg=${errorMsg} Path=${request.nextUrl.pathname}`)
    }

    // If session is invalid, redirect to login (but allow public routes)
    // PGRST116 is expected when session doesn't exist - treat as no session
    const hasValidSession = session && !isNoRowsError && !error
    
    if (!hasValidSession) {
      // Clear invalid session cookie immediately
      supabaseResponse.cookies.delete("session_token")
      
      const isProtected = request.nextUrl.pathname !== "/" &&
        !request.nextUrl.pathname.startsWith("/login") &&
        !request.nextUrl.pathname.startsWith("/auth") &&
        !request.nextUrl.pathname.startsWith("/sign-up")
      
      if (isProtected) {
        console.log(`[MIDDLEWARE] ACTION: REDIRECT From=${request.nextUrl.pathname} To=/auth/login Reason=InvalidSession`)
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        const redirectResponse = NextResponse.redirect(url)
        // Ensure cookie is deleted in redirect response too
        redirectResponse.cookies.delete("session_token")
        return redirectResponse
      }
      console.log(`[MIDDLEWARE] ACTION: ALLOW Path=${request.nextUrl.pathname} Reason=PublicRoute`)
    } else {
      console.log(`[MIDDLEWARE] ACTION: ALLOW Path=${request.nextUrl.pathname} UserID=${session.user_id} SessionValid=YES`)
      // Ensure session cookie is properly set in response with correct options
      const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
      const sessionExpiresAt = new Date(session.expires_at)
      
      // Re-set the session cookie to ensure it has correct options for mobile browsers
      supabaseResponse.cookies.set("session_token", sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        expires: sessionExpiresAt,
        maxAge: Math.floor((sessionExpiresAt.getTime() - Date.now()) / 1000),
      })
    }
  } catch (error) {
    // If there's an error verifying session, allow the request to proceed
    // The page itself will handle authentication
    console.error("[v0] Middleware session check error:", error)
  }

  return supabaseResponse
}

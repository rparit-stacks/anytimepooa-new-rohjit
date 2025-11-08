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
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("[MIDDLEWARE] 🚀 REQUEST RECEIVED")
  console.log("[MIDDLEWARE] Path:", request.nextUrl.pathname)
  console.log("[MIDDLEWARE] Method:", request.method)
  console.log("[MIDDLEWARE] Full URL:", request.url)
  console.log("[MIDDLEWARE] Session Token:", sessionToken ? `✅ EXISTS (${sessionToken.substring(0, 20)}...)` : "❌ MISSING")
  console.log("[MIDDLEWARE] All Cookies Count:", allCookies.length)
  console.log("[MIDDLEWARE] All Cookies:", allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`).join(", ") || "none")
  console.log("[MIDDLEWARE] Cookie Header Raw:", cookieHeader ? cookieHeader.substring(0, 200) + "..." : "❌ NONE")
  console.log("[MIDDLEWARE] User-Agent:", request.headers.get("user-agent")?.substring(0, 50))
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  if (!sessionToken) {
    console.log("[MIDDLEWARE] ⚠️  NO SESSION TOKEN FOUND")
    // No session token, check if route requires auth
    if (
      request.nextUrl.pathname !== "/" &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/sign-up")
    ) {
      console.log("[MIDDLEWARE] ❌ REDIRECTING TO LOGIN")
      console.log("[MIDDLEWARE] Reason: No session token for protected route")
      console.log("[MIDDLEWARE] From:", request.nextUrl.pathname)
      console.log("[MIDDLEWARE] To: /auth/login")
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
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

    console.log("[MIDDLEWARE] 🚀 VERIFYING SESSION IN DATABASE...")
    console.log("[MIDDLEWARE] Path:", request.nextUrl.pathname)
    console.log("[MIDDLEWARE] Session Token Used:", sessionToken.substring(0, 20) + "...")
    console.log("[MIDDLEWARE] Querying database for session...")
    
    const sessionResult = await supabase
      .from("sessions")
      .select("*")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()
    
    const session = sessionResult.data
    const error = sessionResult.error
    
    console.log("[MIDDLEWARE] Database Query Result:")
    console.log("[MIDDLEWARE]   - Session Found:", session ? "✅ YES" : "❌ NO")
    console.log("[MIDDLEWARE]   - Error:", error ? `❌ ${error.message}` : "✅ NONE")
    
    if (session) {
      console.log("[MIDDLEWARE] ✅ VALID SESSION FOUND")
      console.log("[MIDDLEWARE] Session ID:", session.id)
      console.log("[MIDDLEWARE] Session User ID:", session.user_id)
      console.log("[MIDDLEWARE] Session Expires At:", session.expires_at)
      const isExpired = new Date(session.expires_at) < new Date()
      console.log("[MIDDLEWARE] Session Is Expired:", isExpired ? "⚠️ YES" : "✅ NO")
    } else {
      console.log("[MIDDLEWARE] ❌ NO SESSION FOUND IN DATABASE")
      if (error) {
        console.log("[MIDDLEWARE] Error Code:", error.code)
        console.log("[MIDDLEWARE] Error Details:", JSON.stringify(error, null, 2))
      }
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    // If session is invalid, redirect to login (but allow public routes)
    if (error || !session) {
      console.log("[MIDDLEWARE] ❌ DECISION: INVALID SESSION")
      console.log("[MIDDLEWARE] Path:", request.nextUrl.pathname)
      console.log("[MIDDLEWARE] Is Protected Route:", 
        request.nextUrl.pathname !== "/" &&
        !request.nextUrl.pathname.startsWith("/login") &&
        !request.nextUrl.pathname.startsWith("/auth") &&
        !request.nextUrl.pathname.startsWith("/sign-up")
      )
      
      if (
        request.nextUrl.pathname !== "/" &&
        !request.nextUrl.pathname.startsWith("/login") &&
        !request.nextUrl.pathname.startsWith("/auth") &&
        !request.nextUrl.pathname.startsWith("/sign-up")
      ) {
        console.log("[MIDDLEWARE] ❌ ACTION: REDIRECTING TO LOGIN")
        console.log("[MIDDLEWARE] Reason: Invalid or missing session in database")
        console.log("[MIDDLEWARE] From:", request.nextUrl.pathname)
        console.log("[MIDDLEWARE] To: /auth/login")
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
      console.log("[MIDDLEWARE] ✅ ACTION: Allowing public route with invalid session")
    } else {
      console.log("[MIDDLEWARE] ✅ DECISION: VALID SESSION")
      console.log("[MIDDLEWARE] ✅ ACTION: ALLOWING ACCESS")
      console.log("[MIDDLEWARE] User ID:", session.user_id)
      console.log("[MIDDLEWARE] Path:", request.nextUrl.pathname)
      console.log("[MIDDLEWARE] Request will proceed to page component")
    }
  } catch (error) {
    // If there's an error verifying session, allow the request to proceed
    // The page itself will handle authentication
    console.error("[v0] Middleware session check error:", error)
  }

  return supabaseResponse
}

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
  
  console.log("[Middleware] === REQUEST DETAILS ===")
  console.log("[Middleware] Path:", request.nextUrl.pathname)
  console.log("[Middleware] Method:", request.method)
  console.log("[Middleware] Session token:", sessionToken ? `exists (${sessionToken.substring(0, 12)}...)` : "missing")
  console.log("[Middleware] All cookies:", allCookies.map(c => `${c.name}=${c.value.substring(0, 8)}...`).join(", ") || "none")
  console.log("[Middleware] Cookie header:", cookieHeader ? cookieHeader.substring(0, 100) + "..." : "none")
  console.log("[Middleware] User-Agent:", request.headers.get("user-agent")?.substring(0, 50))
  console.log("[Middleware] =======================")

  if (!sessionToken) {
    // No session token, check if route requires auth
    if (
      request.nextUrl.pathname !== "/" &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/sign-up")
    ) {
      console.log("[Middleware] No session token, redirecting to login from:", request.nextUrl.pathname)
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

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

    const { data: session, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    console.log("[Middleware] === SESSION VERIFICATION ===")
    console.log("[Middleware] Path:", request.nextUrl.pathname)
    console.log("[Middleware] Session found:", session ? "YES" : "NO")
    console.log("[Middleware] Session user_id:", session?.user_id || "N/A")
    console.log("[Middleware] Session expires_at:", session?.expires_at || "N/A")
    console.log("[Middleware] Error:", error?.message || "none")
    console.log("[Middleware] Error code:", error?.code || "none")
    console.log("[Middleware] ============================")

    // If session is invalid, redirect to login (but allow public routes)
    if (error || !session) {
      if (
        request.nextUrl.pathname !== "/" &&
        !request.nextUrl.pathname.startsWith("/login") &&
        !request.nextUrl.pathname.startsWith("/auth") &&
        !request.nextUrl.pathname.startsWith("/sign-up")
      ) {
        console.log("[Middleware] Invalid session, redirecting to login from:", request.nextUrl.pathname)
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
    } else {
      console.log("[Middleware] Valid session, allowing access to:", request.nextUrl.pathname)
    }
  } catch (error) {
    // If there's an error verifying session, allow the request to proceed
    // The page itself will handle authentication
    console.error("[v0] Middleware session check error:", error)
  }

  return supabaseResponse
}

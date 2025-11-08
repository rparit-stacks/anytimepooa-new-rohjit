import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Get current user from session token
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session_token")?.value
    const allCookies = cookieStore.getAll()

    console.log(`[getCurrentUser] CHECK | Token: ${sessionToken ? `EXISTS (${sessionToken.substring(0, 16)}...)` : "MISSING"} | CookieCount: ${allCookies.length}`)

    if (!sessionToken) {
      console.log(`[getCurrentUser] RESULT: NO_TOKEN | CookieNames: ${allCookies.map(c => c.name).join(",") || "none"}`)
      return null
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )

    // Get session from database
    // Use maybeSingle() instead of single() to handle no rows gracefully
    // PGRST116 error occurs when .single() finds 0 rows - we want to handle this gracefully
    console.log(`[getCurrentUser] QUERY | Token: ${sessionToken.substring(0, 16)}...`)
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    // Handle PGRST116 specifically (no rows found) - this is expected when session doesn't exist
    const isNoRowsError = sessionError?.code === "PGRST116"
    const hasValidSession = session && !isNoRowsError && !sessionError

    if (!hasValidSession) {
      const errorMsg = isNoRowsError ? "SESSION_NOT_FOUND" : (sessionError?.message || "NOT_FOUND")
      const errorCode = sessionError?.code || "NONE"
      console.log(`[getCurrentUser] RESULT: NO_SESSION | ErrorCode=${errorCode} ErrorMsg=${errorMsg}`)
      return null
    }

    console.log(`[getCurrentUser] RESULT: SESSION_FOUND | UserID=${session.user_id}`)

    // Get user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user_id)
      .single()

    if (userError || !user) {
      const errorMsg = userError?.message || "NOT_FOUND"
      console.log(`[getCurrentUser] RESULT: NO_USER | ErrorMsg=${errorMsg}`)
      return null
    }

    console.log(`[getCurrentUser] RESULT: USER_FOUND | Email=${user.email} | ID=${user.id}`)
    // Return user data
    return user
  } catch (error) {
    console.error("[v0] Error getting current user:", error)
    return null
  }
}

// Create a session token for user
export async function createSession(userId: string) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      },
    )

    // Generate session token
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Delete old sessions for this user
    await supabase.from("sessions").delete().eq("user_id", userId)

    // Create new session
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error || !session) {
      console.error("[v0] Error creating session:", error)
      return null
    }

    return sessionToken
  } catch (error) {
    console.error("[v0] Error creating session:", error)
    return null
  }
}

// Delete session (logout)
export async function deleteSession(sessionToken: string) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      },
    )

    await supabase.from("sessions").delete().eq("token", sessionToken)
  } catch (error) {
    console.error("[v0] Error deleting session:", error)
  }
}


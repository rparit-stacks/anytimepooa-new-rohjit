import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Get current user from session token
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session_token")?.value

    console.log("[getCurrentUser] Session token:", sessionToken ? "exists" : "missing")

    if (!sessionToken) {
      console.log("[getCurrentUser] No session token found")
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
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (sessionError || !session) {
      console.log("[getCurrentUser] Session not found or expired:", sessionError?.message || "no session")
      return null
    }

    console.log("[getCurrentUser] Session found for user_id:", session.user_id)

    // Get user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user_id)
      .single()

    if (userError || !user) {
      console.log("[getCurrentUser] User not found:", userError?.message || "no user")
      return null
    }

    console.log("[getCurrentUser] User found:", user.email)
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


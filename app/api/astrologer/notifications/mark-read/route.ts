import { createClient } from "@/lib/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return Response.json(
        { error: "Invalid session" },
        { status: 401 }
      )
    }

    const { notification_id } = await request.json()

    if (!notification_id) {
      return Response.json(
        { error: "notification_id required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("astrologer_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notification_id)
      .eq("astrologer_id", session.astrologer_id)

    if (error) {
      console.error("[astrologer/notifications/mark-read] Error:", error)
      return Response.json(
        { error: "Failed to mark as read" },
        { status: 500 }
      )
    }

    return Response.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("[astrologer/notifications/mark-read] Error:", err)
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}






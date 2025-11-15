import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

// POST /api/notifications/mark-read
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
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

    const supabase = await createClient()

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification_id)
      .eq("user_id", user.id)

    if (error) {
      console.error("[notifications/mark-read] Error:", error)
      return Response.json(
        { error: "Failed to mark as read" },
        { status: 500 }
      )
    }

    return Response.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("[notifications/mark-read] Error:", err)
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}



import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

// GET /api/notifications - Fetch user notifications
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json(
        { error: "Unauthorized", data: null },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Fetch notifications for user
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[notifications] Query error:", error)
      return Response.json(
        { error: "Failed to fetch notifications", data: null },
        { status: 500 }
      )
    }

    // Get unread count
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0

    return Response.json(
      {
        success: true,
        data: notifications || [],
        unread_count: unreadCount,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[notifications] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}



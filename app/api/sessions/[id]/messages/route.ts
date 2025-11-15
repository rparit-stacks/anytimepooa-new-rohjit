import { createClient } from "@/lib/server"

// GET - Retrieve chat messages for a session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const supabase = await createClient()

    const { data: messages, error } = await supabase
      .from("session_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[sessions/messages] GET error:", error)
      return Response.json(
        { error: "Failed to fetch messages", data: [] },
        { status: 500 }
      )
    }

    return Response.json({ data: messages || [] })
  } catch (err: any) {
    console.error("[sessions/messages] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: [] },
      { status: 500 }
    )
  }
}

// POST - Save a chat message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { sender_type, sender_id, message, message_type = 'text' } = await request.json()

    if (!sender_type || !sender_id || !message) {
      return Response.json(
        { error: "Missing required fields", success: false },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: messageData, error } = await supabase
      .from("session_messages")
      .insert({
        session_id: sessionId,
        sender_type,
        sender_id,
        message,
        message_type,
      })
      .select()
      .single()

    if (error) {
      console.error("[sessions/messages] POST error:", error)
      return Response.json(
        { error: "Failed to save message", success: false },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      data: messageData,
    })
  } catch (err: any) {
    console.error("[sessions/messages] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", success: false },
      { status: 500 }
    )
  }
}

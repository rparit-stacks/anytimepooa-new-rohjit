import { createClient } from "@/lib/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json().catch(() => ({}))
    const { reason = 'completed', participant_type } = body

    const supabase = await createClient()

    // Call database function to end session
    const { data, error } = await supabase.rpc("end_session", {
      p_session_id: sessionId,
      p_reason: reason,
    })

    if (error) {
      console.error("[sessions/end] Error:", error)
      return Response.json(
        { error: "Failed to end session", success: false },
        { status: 500 }
      )
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result.success) {
      return Response.json(result, { status: 400 })
    }

    // Update participant left timestamp
    if (participant_type) {
      const updateField = participant_type === 'user' ? 'user_left_at' : 'astrologer_left_at'
      await supabase
        .from("webrtc_sessions")
        .update({ [updateField]: new Date().toISOString() })
        .eq("id", sessionId)
    }

    // Get final session data
    const { data: sessionData } = await supabase
      .from("webrtc_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    return Response.json({
      success: true,
      duration_seconds: result.duration_seconds,
      duration_minutes: Math.ceil(result.duration_seconds / 60),
      message: result.message,
      session: sessionData,
    })
  } catch (err: any) {
    console.error("[sessions/end] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", success: false },
      { status: 500 }
    )
  }
}

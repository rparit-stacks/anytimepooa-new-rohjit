import { createClient } from "@/lib/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { participant_type } = await request.json()

    if (!participant_type || !['user', 'astrologer'].includes(participant_type)) {
      return Response.json(
        { error: "Invalid participant type", success: false },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call database function to start session
    const { data, error } = await supabase.rpc("start_session", {
      p_session_id: sessionId,
      p_participant_type: participant_type,
    })

    if (error) {
      console.error("[sessions/start] Error:", error)
      return Response.json(
        { error: "Failed to start session", success: false },
        { status: 500 }
      )
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result.success) {
      return Response.json(result, { status: 400 })
    }

    // Get updated session data
    const { data: sessionData, error: sessionError } = await supabase
      .from("webrtc_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !sessionData) {
      console.error("[sessions/start] Session fetch error:", sessionError)
      return Response.json(
        { error: "Failed to fetch session data", success: false },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      session_active: result.session_active,
      message: result.message,
      session: {
        id: sessionData.id,
        status: sessionData.status,
        actual_start_time: sessionData.actual_start_time,
        user_joined_at: sessionData.user_joined_at,
        astrologer_joined_at: sessionData.astrologer_joined_at,
      },
    })
  } catch (err: any) {
    console.error("[sessions/start] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", success: false },
      { status: 500 }
    )
  }
}

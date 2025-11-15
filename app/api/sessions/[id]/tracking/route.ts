import { createClient } from "@/lib/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    console.log('[tracking] Fetching tracking for session:', id)

    // Try to get tracking data
    const { data, error } = await supabase
      .from('session_tracking')
      .select('*')
      .eq('session_id', id)
      .single()

    if (error) {
      console.error('[tracking] No tracking record found, checking webrtc_sessions:', error)
      
      // Fallback: Get data from webrtc_sessions if tracking doesn't exist yet
      const { data: sessionData, error: sessionError } = await supabase
        .from('webrtc_sessions')
        .select('*')
        .eq('id', id)
        .single()
      
      if (sessionError || !sessionData) {
        throw new Error('Session not found')
      }
      
      // Calculate from webrtc_sessions
      let currentDurationSeconds = 0
      if (sessionData.actual_start_time) {
        currentDurationSeconds = Math.floor((Date.now() - new Date(sessionData.actual_start_time).getTime()) / 1000)
      }
      
      const paidDurationSeconds = (sessionData.paid_duration_minutes || 0) * 60
      const remainingSeconds = Math.max(0, paidDurationSeconds - currentDurationSeconds)
      
      console.log('[tracking] Using webrtc_sessions data:', {
        currentDurationSeconds,
        paidDurationSeconds,
        remainingSeconds
      })
      
      return Response.json({
        success: true,
        data: {
          session_id: id,
          paid_duration_seconds: paidDurationSeconds,
          currentDurationSeconds,
          remainingSeconds,
          shouldWarn: remainingSeconds <= 300,
          isOvertime: currentDurationSeconds > paidDurationSeconds,
          tracking_status: sessionData.status
        }
      })
    }

    // Calculate current duration if session is active
    let currentDurationSeconds = data.duration_seconds || 0
    if (data.tracking_status === 'active' && data.actual_start) {
      const elapsed = Math.floor((Date.now() - new Date(data.actual_start).getTime()) / 1000)
      currentDurationSeconds = elapsed
    }

    const remainingSeconds = Math.max(0, data.paid_duration_seconds - currentDurationSeconds)
    const shouldWarn = remainingSeconds <= 300 // 5 minutes

    console.log('[tracking] Tracking data:', {
      currentDurationSeconds,
      paidDurationSeconds: data.paid_duration_seconds,
      remainingSeconds
    })

    return Response.json({
      success: true,
      data: {
        ...data,
        currentDurationSeconds,
        remainingSeconds,
        shouldWarn,
        isOvertime: currentDurationSeconds > data.paid_duration_seconds
      }
    })
  } catch (err: any) {
    console.error("[session-tracking] Error:", err)
    return Response.json(
      { error: err.message || "Failed to get session tracking" },
      { status: 500 }
    )
  }
}


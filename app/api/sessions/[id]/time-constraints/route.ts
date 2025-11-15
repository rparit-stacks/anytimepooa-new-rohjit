import { createClient } from "@/lib/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: tracking, error } = await supabase
      .from('session_tracking')
      .select('*')
      .eq('session_id', params.id)
      .single()

    if (error) throw error

    let currentDurationSeconds = 0
    if (tracking.tracking_status === 'active' && tracking.actual_start) {
      currentDurationSeconds = Math.floor(
        (Date.now() - new Date(tracking.actual_start).getTime()) / 1000
      )
    }

    const remainingSeconds = Math.max(0, tracking.paid_duration_seconds - currentDurationSeconds)
    const shouldWarn = remainingSeconds <= 300
    const minutesRemaining = Math.floor(remainingSeconds / 60)

    return Response.json({
      success: true,
      isWithinLimit: tracking.is_within_time_limit,
      remainingSeconds,
      shouldWarn,
      message: shouldWarn
        ? `Only ${minutesRemaining} minutes remaining`
        : `${minutesRemaining} minutes remaining`
    })
  } catch (err: any) {
    console.error("[time-constraints] Error:", err)
    return Response.json(
      { error: err.message || "Failed to check time constraints" },
      { status: 500 }
    )
  }
}


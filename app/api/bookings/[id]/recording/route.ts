import { createClient } from "@/lib/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('session_recordings')
      .select('*')
      .eq('booking_id', params.id)
      .eq('recording_status', 'completed')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({
          success: false,
          message: "Recording not available"
        })
      }
      throw error
    }

    // Check if expired
    const isExpired = data.expiry_date && new Date(data.expiry_date) < new Date()

    return Response.json({
      success: true,
      data: {
        ...data,
        is_currently_available: data.is_available && !isExpired
      }
    })
  } catch (err: any) {
    console.error("[recording] Error:", err)
    return Response.json(
      { error: err.message || "Failed to fetch recording" },
      { status: 500 }
    )
  }
}


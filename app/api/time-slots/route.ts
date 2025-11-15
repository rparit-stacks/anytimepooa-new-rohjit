import { createClient } from "@/lib/server"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const astrologerId = searchParams.get('astrologerId')
    const date = searchParams.get('date')

    if (astrologerId && date) {
      // Get filtered time slots by astrologer availability
      const dayOfWeek = new Date(date).getDay()

      // First get all time slots
      const { data: allSlots, error: slotsError } = await supabase
        .from('time_slots')
        .select('time_12h, time_24h, period, display_label, sort_order')
        .order('sort_order')

      if (slotsError) {
        console.error('[time-slots] Slots query error:', slotsError)
        throw slotsError
      }

      // Get astrologer availability for this day
      const { data: availability, error: availError } = await supabase
        .from('astrologer_availability_schedule')
        .select('start_time, end_time')
        .eq('astrologer_id', astrologerId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)

      if (availError) {
        console.error('[time-slots] Availability query error:', availError)
        // Return all slots if availability check fails
        return Response.json({
          success: true,
          data: allSlots || []
        })
      }

      if (availability && availability.length > 0) {
        // Filter time slots based on availability windows
        const filteredSlots = (allSlots || []).filter((slot: any) => {
          return availability.some((avail: any) => {
            return slot.time_24h >= avail.start_time && slot.time_24h <= avail.end_time
          })
        })

        return Response.json({
          success: true,
          data: filteredSlots
        })
      }

      // No availability found, return all slots
      return Response.json({
        success: true,
        data: allSlots || []
      })
    } else {
      // Get all time slots
      const { data, error } = await supabase
        .from('time_slots')
        .select('time_12h, time_24h, period, display_label')
        .order('sort_order')

      if (error) {
        console.error('[time-slots] Query error:', error)
        throw error
      }

      return Response.json({
        success: true,
        data: data || []
      })
    }
  } catch (err: any) {
    console.error("[time-slots] Error:", err)
    return Response.json(
      {
        success: false,
        error: err.message || "Failed to fetch time slots"
      },
      { status: 500 }
    )
  }
}

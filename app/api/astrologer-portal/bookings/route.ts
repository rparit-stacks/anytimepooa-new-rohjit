import { createClient } from "@/lib/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return Response.json(
        { error: "Unauthorized - No token", data: null },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Verify astrologer session
    const { data: session, error: sessionError } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return Response.json(
        { error: "Unauthorized - Invalid or expired session", data: null },
        { status: 401 }
      )
    }

    const astrologerId = session.astrologer_id

    // Fetch astrologer's bookings with user and session details
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        user:users!bookings_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        ),
        webrtc_session:webrtc_sessions!bookings_webrtc_session_id_fkey (
          id,
          user_token,
          astrologer_token,
          scheduled_start_time,
          link_valid_until,
          status,
          room_id
        )
      `)
      .eq("astrologer_id", astrologerId)
      .order("session_date", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[astrologer/bookings] Query error:", error)
      return Response.json(
        { error: "Failed to fetch bookings", data: null },
        { status: 500 }
      )
    }

    console.log("[astrologer/bookings] Raw count:", bookings?.length || 0)

    // Transform data for frontend
    const transformedBookings = (bookings || []).map((booking: any) => {
      const sessionLink = booking.webrtc_session?.astrologer_token 
        ? `/session/${booking.webrtc_session.astrologer_token}`
        : null
      
      return {
        id: booking.id,
        booking_reference: booking.booking_reference,
        user_id: booking.user_id,
        user_name: booking.user?.full_name || "Unknown User",
        user_avatar: booking.user?.avatar_url,
        session_date: booking.session_date,
        session_type: booking.session_type,
        duration_minutes: booking.duration_minutes,
        amount: booking.amount,
        status: booking.status,
        astrologer_status: booking.astrologer_status,
        created_at: booking.created_at,
        // Session link details
        session_link: sessionLink,
        session_status: booking.webrtc_session?.status || null,
        scheduled_start_time: booking.webrtc_session?.scheduled_start_time,
        link_valid_until: booking.webrtc_session?.link_valid_until,
      }
    })

    console.log("[astrologer/bookings] Transformed count:", transformedBookings.length)

    return Response.json(
      {
        success: true,
        data: transformedBookings,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[astrologer/bookings] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}


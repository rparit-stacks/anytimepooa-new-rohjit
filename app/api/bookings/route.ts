import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

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

    // Fetch user's bookings with astrologer and session details
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        astrologer:astrologers!bookings_astrologer_id_fkey (
          id,
          name,
          avatar_url,
          profile_picture_url
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
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[bookings] Query error:", error)
      return Response.json(
        { error: "Failed to fetch bookings", data: null },
        { status: 500 }
      )
    }

    console.log("[bookings] Raw data:", JSON.stringify(bookings?.slice(0, 2), null, 2))

    // Transform data for frontend
    const transformedBookings = (bookings || []).map((booking: any) => {
      const avatarUrl = booking.astrologer?.profile_picture_url || booking.astrologer?.avatar_url
      const sessionLink = booking.webrtc_session?.user_token 
        ? `/session/${booking.webrtc_session.user_token}`
        : null
      
      return {
        id: booking.id,
        booking_reference: booking.booking_reference,
        astrologer_id: booking.astrologer_id,
        astrologer_name: booking.astrologer?.name || "Unknown Astrologer",
        astrologer_avatar: avatarUrl,
        session_date: booking.session_date,
        session_type: booking.session_type,
        duration_minutes: booking.duration_minutes,
        amount: booking.amount,
        status: booking.status,
        created_at: booking.created_at,
        // Session link details
        session_link: sessionLink,
        session_status: booking.webrtc_session?.status || null,
        scheduled_start_time: booking.webrtc_session?.scheduled_start_time,
        link_valid_until: booking.webrtc_session?.link_valid_until,
      }
    })

    console.log("[bookings] Transformed count:", transformedBookings.length)

    return Response.json(
      {
        success: true,
        data: transformedBookings,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[bookings] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}


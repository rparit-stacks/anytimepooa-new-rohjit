import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get astrologer from session
    const { data: session } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      )
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"

    // Build query
    let query = supabase
      .from("bookings")
      .select(`
        *,
        users (
          name,
          email,
          phone
        )
      `)
      .eq("astrologer_id", session.astrologer_id)
      .order("created_at", { ascending: false })

    // Apply filter
    if (status !== "all") {
      query = query.eq("status", status)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error("[astrologer/bookings] Error:", error)
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      )
    }

    // Format the response
    const formattedBookings = bookings?.map((booking: any) => ({
      id: booking.id,
      user_name: booking.users?.name || "Unknown",
      user_email: booking.users?.email || "",
      user_phone: booking.users?.phone || "",
      service_type: booking.service_type || "consultation",
      service_name: booking.service_name || "Consultation",
      amount: booking.amount || 0,
      status: booking.status,
      scheduled_at: booking.scheduled_at,
      created_at: booking.created_at,
      notes: booking.notes,
    })) || []

    return NextResponse.json({
      success: true,
      bookings: formattedBookings,
    })
  } catch (error: any) {
    console.error("[astrologer/bookings] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

async function getAstrologerFromSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("astrologer_session_token")?.value

  if (!sessionToken) {
    return null
  }

  const supabase = await createClient()

  const { data: session } = await supabase
    .from("astrologer_sessions")
    .select("astrologer_id")
    .eq("token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .single()

  return session?.astrologer_id || null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const astrologerId = await getAstrologerFromSession()

    if (!astrologerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { id: bookingId } = await params

    const supabase = await createClient()

    // Call database function to accept booking
    const { data, error } = await supabase.rpc("accept_booking", {
      p_booking_id: bookingId,
      p_astrologer_id: astrologerId,
    })

    if (error) {
      console.error("[astrologer/bookings/accept] Error:", error)
      return NextResponse.json(
        { error: "Failed to accept booking" },
        { status: 500 }
      )
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to accept booking" },
        { status: 400 }
      )
    }

    // Create notification for astrologer
    await supabase.from("astrologer_notifications").insert({
      astrologer_id: astrologerId,
      type: "booking_accepted",
      title: "Booking Accepted",
      message: "You have successfully accepted the booking. Payment has been credited to your wallet.",
      reference_type: "booking",
      reference_id: bookingId,
      priority: "normal",
    })

    return NextResponse.json({
      success: true,
      message: "Booking accepted successfully",
    })
  } catch (error: any) {
    console.error("[astrologer/bookings/accept] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

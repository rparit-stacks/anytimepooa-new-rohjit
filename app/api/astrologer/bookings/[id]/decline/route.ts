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
    const { reason } = await request.json()

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a reason (minimum 10 characters)" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call database function to decline booking with penalty
    const { data, error } = await supabase.rpc("decline_booking_with_penalty", {
      p_booking_id: bookingId,
      p_astrologer_id: astrologerId,
      p_decline_reason: reason,
    })

    if (error) {
      console.error("[astrologer/bookings/decline] Error:", error)
      return NextResponse.json(
        { error: "Failed to decline booking" },
        { status: 500 }
      )
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to decline booking" },
        { status: 400 }
      )
    }

    // Create notification for astrologer
    const penaltyAmount = result.penalty_amount || 0
    const newBalance = result.astrologer_new_balance || 0

    await supabase.from("astrologer_notifications").insert({
      astrologer_id: astrologerId,
      type: "booking_declined",
      title: "Booking Declined",
      message: `Booking declined. User refunded ₹${result.refund_amount}. Penalty of ₹${penaltyAmount} (1%) deducted. New balance: ₹${newBalance}`,
      reference_type: "booking",
      reference_id: bookingId,
      priority: "high",
    })

    return NextResponse.json({
      success: true,
      message: "Booking declined successfully",
      penalty_amount: penaltyAmount,
      refund_amount: result.refund_amount,
      new_balance: newBalance,
    })
  } catch (error: any) {
    console.error("[astrologer/bookings/decline] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: bookingId } = await params
    const { reason = "User cancelled" } = await request.json().catch(() => ({}))
    
    const supabase = await createClient()

    // Call database function to cancel booking and process refund
    const { data, error } = await supabase.rpc("cancel_booking_with_refund", {
      p_booking_id: bookingId,
      p_user_id: user.id,
      p_cancellation_reason: reason,
    })

    if (error) {
      console.error("[bookings/cancel] Error:", error)
      return Response.json(
        { error: "Failed to cancel booking" },
        { status: 500 }
      )
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to cancel booking" },
        { status: 400 }
      )
    }

    return Response.json({
      success: true,
      message: "Booking cancelled and refunded successfully",
      refund_amount: result.refund_amount,
      new_balance: result.user_new_balance,
    })
  } catch (error: any) {
    console.error("[bookings/cancel] Unexpected error:", error)
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


import { createClient } from "@/lib/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    const currentTime = new Date()

    console.log('[join-status] Checking booking:', id)

    // Get booking details directly
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, created_at, duration_minutes, status, booking_reference')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      console.error("[join-status] Booking not found:", bookingError)
      return Response.json({
        success: false,
        canJoin: false,
        message: 'Booking not found',
        status: 'invalid'
      })
    }

    // Check if booking is cancelled or completed
    if (booking.status === 'cancelled') {
      return Response.json({
        success: true,
        canJoin: false,
        message: 'This booking has been cancelled',
        status: 'cancelled'
      })
    }

    if (booking.status === 'completed') {
      return Response.json({
        success: true,
        canJoin: false,
        message: 'This session has already been completed',
        status: 'completed'
      })
    }

    // Calculate expiry time: created_at + duration_minutes
    const createdAt = new Date(booking.created_at)
    const expiryTime = new Date(createdAt.getTime() + (booking.duration_minutes * 60 * 1000))
    
    console.log('[join-status] Created:', createdAt.toISOString())
    console.log('[join-status] Expires:', expiryTime.toISOString())
    console.log('[join-status] Current:', currentTime.toISOString())

    // Check if expired (current time > created_at + duration)
    if (currentTime > expiryTime) {
      return Response.json({
        success: true,
        canJoin: false,
        message: 'Booking has expired. Join button is no longer available.',
        status: 'expired',
        expiredAt: expiryTime.toISOString()
      })
    }

    // Can join! (anytime before expiry)
    const minutesLeft = Math.floor((expiryTime.getTime() - currentTime.getTime()) / (1000 * 60))
    
    return Response.json({
      success: true,
      canJoin: true,
      message: 'You can join the session now',
      status: 'ready',
      minutesUntilExpiry: minutesLeft,
      expiresAt: expiryTime.toISOString()
    })
  } catch (err: any) {
    console.error("[join-status] Unexpected error:", err)
    return Response.json(
      {
        success: false,
        error: err.message || "Internal server error"
      },
      { status: 500 }
    )
  }
}

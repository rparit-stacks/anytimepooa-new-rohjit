import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"
import { sendEmail } from "@/lib/email"

interface PoojaBookingRequestBody {
  pooja_service_id: string
  astrologer_id: string
  booking_date: string
  booking_time: string
  address: string
  city: string
  special_instructions?: string
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json(
        { error: "Unauthorized", data: null },
        { status: 401 }
      )
    }

    const body: PoojaBookingRequestBody = await request.json()
    const {
      pooja_service_id,
      astrologer_id,
      booking_date,
      booking_time,
      address,
      city,
      special_instructions,
    } = body

    // Validate required fields
    if (!pooja_service_id || !astrologer_id || !booking_date || !booking_time || !address || !city) {
      return Response.json(
        { error: "Missing required fields", data: null },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get pooja service details
    const { data: service, error: serviceError } = await supabase
      .from("pooja_services")
      .select("id, name, base_price")
      .eq("id", pooja_service_id)
      .single()

    if (serviceError || !service) {
      return Response.json(
        { error: "Pooja service not found", data: null },
        { status: 404 }
      )
    }

    // Get astrologer details
    const { data: astrologer, error: astrologerError } = await supabase
      .from("astrologers")
      .select("id, name, email, price_per_session, latitude, longitude, location")
      .eq("id", astrologer_id)
      .single()

    if (astrologerError || !astrologer) {
      return Response.json(
        { error: "Astrologer not found", data: null },
        { status: 404 }
      )
    }

    // Calculate total amount
    const servicePrice = parseFloat(service.base_price)
    const astrologerPrice = parseFloat(astrologer.price_per_session || "0")
    const totalAmount = servicePrice + astrologerPrice

    // Check wallet balance
    const { data: walletData, error: walletError } = await supabase
      .from("wallet_balance")
      .select("balance")
      .eq("user_id", user.id)
      .single()

    const currentBalance = walletData ? parseFloat(walletData.balance) : 0

    if (walletError && walletError.code !== "PGRST116") {
      console.error("[pooja/bookings/create] Wallet check error:", walletError)
      return Response.json(
        { error: "Failed to check wallet balance", data: null },
        { status: 500 }
      )
    }

    // Check if sufficient balance
    if (currentBalance < totalAmount) {
      return Response.json(
        {
          error: "INSUFFICIENT_BALANCE",
          message: "Insufficient balance. Please recharge your wallet.",
          data: {
            current_balance: currentBalance,
            required_amount: totalAmount,
            shortfall: totalAmount - currentBalance,
          },
        },
        { status: 400 }
      )
    }

    // Combine date and time
    const bookingDateTime = new Date(`${booking_date}T${booking_time}`)
    if (isNaN(bookingDateTime.getTime())) {
      return Response.json(
        { error: "Invalid date or time format", data: null },
        { status: 400 }
      )
    }

    // Check if booking date is in the past
    if (bookingDateTime < new Date()) {
      return Response.json(
        { error: "Cannot book in the past", data: null },
        { status: 400 }
      )
    }

    // Create pooja booking
    const { data: booking, error: bookingError } = await supabase
      .from("pooja_bookings")
      .insert({
        user_id: user.id,
        pooja_service_id,
        astrologer_id,
        booking_date,
        booking_time,
        address,
        city,
        special_instructions,
        total_amount: totalAmount,
        astrologer_price: astrologerPrice,
        service_price: servicePrice,
        status: "pending",
      })
      .select()
      .single()

    if (bookingError) {
      console.error("[pooja/bookings/create] Booking creation error:", bookingError)
      return Response.json(
        { error: "Failed to create booking", data: null },
        { status: 500 }
      )
    }

    // Deduct amount from wallet
    const { error: walletUpdateError } = await supabase
      .from("wallet_balance")
      .update({
        balance: currentBalance - totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (walletUpdateError) {
      console.error("[pooja/bookings/create] Wallet deduction error:", walletUpdateError)
      // Rollback booking
      await supabase.from("pooja_bookings").delete().eq("id", booking.id)
      return Response.json(
        { error: "Failed to deduct wallet balance", data: null },
        { status: 500 }
      )
    }

    // Record wallet transaction
    const { error: transactionError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "debit",
        amount: totalAmount,
        description: `Pooja booking: ${service.name} with ${astrologer.name}`,
        status: "completed",
        pooja_booking_id: booking.id,
      })

    if (transactionError) {
      console.error("[pooja/bookings/create] Transaction recording error:", transactionError)
      // Don't rollback - transaction recording is not critical
    }

    // Confirm booking status
    const { error: confirmError } = await supabase
      .from("pooja_bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id)

    if (confirmError) {
      console.error("[pooja/bookings/create] Booking confirmation error:", confirmError)
    }

    // Send notifications (async, don't wait)
    sendPoojaNotifications(user, astrologer, service, booking, bookingDateTime)
      .catch(err => console.error("[pooja/bookings/create] Notification error:", err))

    return Response.json(
      {
        success: true,
        message: "Pooja booking confirmed successfully",
        data: {
          booking_id: booking.id,
          booking_reference: booking.booking_reference,
          service_name: service.name,
          astrologer_name: astrologer.name,
          booking_date,
          booking_time,
          total_amount: totalAmount,
          new_balance: currentBalance - totalAmount,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[pooja/bookings/create] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}

async function sendPoojaNotifications(
  user: any,
  astrologer: any,
  service: any,
  booking: any,
  bookingDateTime: Date
) {
  const supabase = await createClient()

  // Create notifications in database
  const notifications = [
    {
      user_id: user.id,
      type: "pooja_booking_confirmed",
      title: "Pooja Booking Confirmed",
      message: `Your ${service.name} booking with ${astrologer.name} is confirmed for ${bookingDateTime.toLocaleString()}`,
      reference_id: booking.id,
      reference_type: "pooja_booking",
    },
    {
      astrologer_id: astrologer.id,
      type: "new_pooja_booking",
      title: "New Pooja Booking Received",
      message: `You have a new ${service.name} booking on ${bookingDateTime.toLocaleString()}`,
      reference_id: booking.id,
      reference_type: "pooja_booking",
    },
  ]

  await supabase.from("notifications").insert(notifications)

  // Send email to user
  try {
    await sendEmail({
      to: user.email,
      subject: "Pooja Booking Confirmation - AstroTalk",
      html: `
        <h2>Your Pooja Booking is Confirmed!</h2>
        <p>Hello ${user.full_name || "there"},</p>
        <p>Your ${service.name} booking with ${astrologer.name} has been confirmed.</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Reference:</strong> ${booking.booking_reference}</li>
          <li><strong>Service:</strong> ${service.name}</li>
          <li><strong>Astrologer:</strong> ${astrologer.name}</li>
          <li><strong>Date & Time:</strong> ${bookingDateTime.toLocaleString()}</li>
          <li><strong>Address:</strong> ${booking.address}, ${booking.city}</li>
          <li><strong>Amount Paid:</strong> ₹${booking.total_amount}</li>
        </ul>
        <p>The astrologer will contact you before the scheduled time.</p>
        <p>Thank you for choosing AstroTalk!</p>
      `,
    })
  } catch (emailErr) {
    console.error("[pooja/bookings/create] User email error:", emailErr)
  }

  // Send email to astrologer
  try {
    await sendEmail({
      to: astrologer.email,
      subject: "New Pooja Booking - AstroTalk",
      html: `
        <h2>New Pooja Booking Received!</h2>
        <p>Hello ${astrologer.name},</p>
        <p>You have a new ${service.name} booking.</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Reference:</strong> ${booking.booking_reference}</li>
          <li><strong>Service:</strong> ${service.name}</li>
          <li><strong>Date & Time:</strong> ${bookingDateTime.toLocaleString()}</li>
          <li><strong>Client:</strong> ${user.full_name || user.email}</li>
          <li><strong>Address:</strong> ${booking.address}, ${booking.city}</li>
          <li><strong>Special Instructions:</strong> ${booking.special_instructions || "None"}</li>
        </ul>
        <p>Please contact the client before the scheduled time to confirm.</p>
      `,
    })
  } catch (emailErr) {
    console.error("[pooja/bookings/create] Astrologer email error:", emailErr)
  }

  // Update notification flags
  await supabase
    .from("pooja_bookings")
    .update({
      user_notified: true,
      astrologer_notified: true,
    })
    .eq("id", booking.id)
}

import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"
import { sendEmail } from "@/lib/email"

interface BookingRequestBody {
  astrologer_id: string
  session_date: string
  session_time?: string // 24-hour format (legacy support)
  session_time_12h?: string // 12-hour format: "02:30 PM"
  session_type: "chat" | "voice" | "video"
  duration_minutes: number
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

    const body: BookingRequestBody = await request.json()
    const {
      astrologer_id,
      session_date,
      session_time,
      session_time_12h,
      session_type,
      duration_minutes,
    } = body

    // Validate required fields
    if (!astrologer_id || !session_date || (!session_time && !session_time_12h) || !session_type || !duration_minutes) {
      return Response.json(
        { error: "Missing required fields", data: null },
        { status: 400 }
      )
    }

    // Validate session_type
    if (!["chat", "voice", "video"].includes(session_type)) {
      return Response.json(
        { error: "Invalid session type. Must be chat, voice, or video.", data: null },
        { status: 400 }
      )
    }

    // Validate duration
    if (duration_minutes <= 0 || duration_minutes > 480) {
      return Response.json(
        { error: "Invalid duration. Must be between 1 and 480 minutes.", data: null },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get astrologer details
    const { data: astrologer, error: astrologerError } = await supabase
      .from("astrologers")
      .select("id, name, email, rate_session_per_minute, rate_video_per_minute, rate_chat_per_minute")
      .eq("id", astrologer_id)
      .single()

    if (astrologerError || !astrologer) {
      return Response.json(
        { error: "Astrologer not found", data: null },
        { status: 404 }
      )
    }

    // Calculate amount based on session type and duration
    let rate_per_minute = 0
    switch (session_type) {
      case "chat":
        rate_per_minute = parseFloat(astrologer.rate_chat_per_minute || "0")
        break
      case "voice":
        rate_per_minute = parseFloat(astrologer.rate_session_per_minute || "0")
        break
      case "video":
        rate_per_minute = parseFloat(astrologer.rate_video_per_minute || "0")
        break
    }

    if (rate_per_minute <= 0) {
      return Response.json(
        { error: `${session_type} rate not available for this astrologer`, data: null },
        { status: 400 }
      )
    }

    const total_amount = rate_per_minute * duration_minutes

    // Check wallet balance
    const { data: walletData, error: walletError } = await supabase
      .from("wallet_balance")
      .select("balance")
      .eq("user_id", user.id)
      .single()

    const currentBalance = walletData ? parseFloat(walletData.balance) : 0

    if (walletError && walletError.code !== "PGRST116") {
      console.error("[bookings/create] Wallet check error:", walletError)
      return Response.json(
        { error: "Failed to check wallet balance", data: null },
        { status: 500 }
      )
    }

    // Check if sufficient balance
    if (currentBalance < total_amount) {
      return Response.json(
        {
          error: "INSUFFICIENT_BALANCE",
          message: "Insufficient balance. Please recharge your wallet.",
          data: {
            current_balance: currentBalance,
            required_amount: total_amount,
            shortfall: total_amount - currentBalance,
          },
        },
        { status: 400 }
      )
    }

    // Combine date and time for session_date timestamp
    // Support both 12-hour format ("02:30 PM") and 24-hour format ("14:30")
    let sessionDateTime: Date
    let time24h: string
    let scheduledTime12h: string
    let scheduledTime24h: string
    let timePeriod: string | null = null

    if (session_time_12h) {
      // Parse 12-hour format: "02:30 PM" or "02:30PM"
      const timeParts = session_time_12h.trim().split(' ')
      const timeStr = timeParts[0] // "02:30"
      const period = timeParts[1]?.toUpperCase() || timeParts[0].slice(-2) // "PM" or extract from end
      
      // If period is at the end of timeStr (e.g., "02:30PM")
      if (!period || period.length > 2) {
        const match = session_time_12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
        if (match) {
          timePeriod = match[3].toUpperCase()
          const [hours, minutes] = [parseInt(match[1]), parseInt(match[2])]
          let hours24 = hours
          if (timePeriod === 'PM' && hours !== 12) hours24 = hours + 12
          if (timePeriod === 'AM' && hours === 12) hours24 = 0
          time24h = `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        } else {
          return Response.json(
            { error: "Invalid 12-hour time format. Expected format: '02:30 PM'", data: null },
            { status: 400 }
          )
        }
      } else {
        timePeriod = period
        const [hours, minutes] = timeStr.split(':').map(Number)
        let hours24 = hours
        if (timePeriod === 'PM' && hours !== 12) hours24 = hours + 12
        if (timePeriod === 'AM' && hours === 12) hours24 = 0
        time24h = `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }
      
      scheduledTime12h = session_time_12h
      scheduledTime24h = time24h
    } else if (session_time) {
      // Legacy 24-hour format support
      time24h = session_time
      scheduledTime24h = session_time
      // Try to convert to 12-hour for display
      const [hours, mins] = session_time.split(':').map(Number)
      if (hours >= 12) {
        const hours12 = hours === 12 ? 12 : hours - 12
        scheduledTime12h = `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} PM`
        timePeriod = 'PM'
      } else {
        const hours12 = hours === 0 ? 12 : hours
        scheduledTime12h = `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} AM`
        timePeriod = 'AM'
      }
    } else {
      return Response.json(
        { error: "Either session_time or session_time_12h is required", data: null },
        { status: 400 }
      )
    }
    
    // Parse the date/time components
    const [year, month, day] = session_date.split('-').map(Number)
    const [hours, minutes] = time24h.split(':').map(Number)
    
    // Create date in UTC with exact time values
    sessionDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))
    
    if (isNaN(sessionDateTime.getTime())) {
      return Response.json(
        { error: "Invalid date or time format", data: null },
        { status: 400 }
      )
    }

    console.log('[bookings/create] Session time:', {
      input: { session_date, session_time, session_time_12h },
      scheduledTime12h,
      scheduledTime24h,
      utcTime: sessionDateTime.toISOString(),
      displayTime: sessionDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    })

    // Check if session date is in the past
    if (sessionDateTime < new Date()) {
      return Response.json(
        { error: "Cannot book sessions in the past", data: null },
        { status: 400 }
      )
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        astrologer_id,
        session_date: sessionDateTime.toISOString(),
        scheduled_date: session_date,
        scheduled_time_12h: scheduledTime12h,
        scheduled_time_24h: scheduledTime24h,
        time_period: timePeriod,
        session_type,
        duration_minutes,
        amount: total_amount,
        status: "pending",
      })
      .select()
      .single()

    if (bookingError) {
      console.error("[bookings/create] Booking creation error:", bookingError)
      return Response.json(
        { error: "Failed to create booking", data: null },
        { status: 500 }
      )
    }

    // Deduct amount from wallet
    const { error: walletUpdateError } = await supabase
      .from("wallet_balance")
      .update({
        balance: currentBalance - total_amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (walletUpdateError) {
      console.error("[bookings/create] Wallet deduction error:", walletUpdateError)
      // Rollback booking
      await supabase.from("bookings").delete().eq("id", booking.id)
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
        amount: total_amount,
        description: `Booking ${session_type} session with ${astrologer.name} for ${duration_minutes} minutes`,
        status: "completed",
        booking_id: booking.id,
      })

    if (transactionError) {
      console.error("[bookings/create] Transaction recording error:", transactionError)
      // Don't rollback - transaction recording is not critical
    }

    // Create WebRTC session with unique tokens
    const userToken = `usr_${booking.id}_${Math.random().toString(36).substring(2, 15)}`
    const astrologerToken = `ast_${booking.id}_${Math.random().toString(36).substring(2, 15)}`
    const roomId = `room_${booking.id}_${Date.now()}`
    const validityMinutes = duration_minutes * 3 // 3x the paid duration
    const linkValidUntil = new Date(sessionDateTime.getTime() + validityMinutes * 60 * 1000)

    const { data: webrtcSession, error: sessionError } = await supabase
      .from("webrtc_sessions")
      .insert({
        booking_id: booking.id,
        user_id: user.id,
        astrologer_id,
        session_type,
        paid_duration_minutes: duration_minutes,
        validity_minutes: validityMinutes,
        user_token: userToken,
        astrologer_token: astrologerToken,
        room_id: roomId,
        scheduled_start_time: sessionDateTime.toISOString(),
        link_valid_until: linkValidUntil.toISOString(),
        status: 'scheduled',
      })
      .select()
      .single()

    if (sessionError) {
      console.error("[bookings/create] WebRTC session creation error:", sessionError)
      // Don't rollback - session can be created later
    }

    // Update booking with webrtc_session_id and confirm status
    const { error: confirmError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        webrtc_session_id: webrtcSession?.id,
      })
      .eq("id", booking.id)

    if (confirmError) {
      console.error("[bookings/create] Booking confirmation error:", confirmError)
    }

    // Generate session links - use proper base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const userSessionLink = `${baseUrl}/session/${userToken}`
    const astrologerSessionLink = `${baseUrl}/session/${astrologerToken}`

    console.log('[bookings/create] Session links generated:')
    console.log('  User link:', userSessionLink)
    console.log('  Astrologer link:', astrologerSessionLink)

    // Send notifications with session links (async, don't wait)
    sendNotifications(
      user,
      astrologer,
      booking,
      session_type,
      sessionDateTime,
      duration_minutes,
      userSessionLink,
      astrologerSessionLink,
      webrtcSession
    ).catch(err => console.error("[bookings/create] Notification error:", err))

    return Response.json(
      {
        success: true,
        message: "Booking created successfully",
        data: {
          booking_id: booking.id,
          booking_reference: booking.booking_reference,
          session_type,
          session_date: sessionDateTime.toISOString(),
          duration_minutes,
          amount: total_amount,
          new_balance: currentBalance - total_amount,
          session_links: {
            user: userSessionLink,
            astrologer: astrologerSessionLink,
            room_id: roomId,
            valid_until: linkValidUntil.toISOString(),
          },
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[bookings/create] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}

async function sendNotifications(
  user: any,
  astrologer: any,
  booking: any,
  session_type: string,
  sessionDateTime: Date,
  duration_minutes: number,
  userSessionLink: string,
  astrologerSessionLink: string,
  webrtcSession: any
) {
  const supabase = await createClient()

  // Create notifications in database
  const notifications = [
    {
      user_id: user.id,
      type: "booking_confirmed",
      title: "Booking Confirmed",
      message: `Your ${session_type} session with ${astrologer.name} is confirmed for ${sessionDateTime.toLocaleString()}`,
      reference_id: booking.id,
      reference_type: "booking",
    },
    {
      astrologer_id: astrologer.id,
      type: "new_booking",
      title: "New Booking Received",
      message: `You have a new ${session_type} session booking for ${duration_minutes} minutes on ${sessionDateTime.toLocaleString()}`,
      reference_id: booking.id,
      reference_type: "booking",
    },
  ]

  await supabase.from("notifications").insert(notifications)

  // Send email to user
  try {
    const linkValidityHours = webrtcSession ? Math.floor(webrtcSession.validity_minutes / 60) : 0
    await sendEmail({
      to: user.email,
      subject: "Booking Confirmation - AstroTalk",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #fb923c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hello ${user.full_name || "there"},</p>
              <p>Your ${session_type} session with <strong>${astrologer.name}</strong> has been confirmed.</p>

              <div class="details">
                <h3>📋 Booking Details</h3>
                <ul>
                  <li><strong>Reference:</strong> ${booking.booking_reference}</li>
                  <li><strong>Session Type:</strong> ${session_type.toUpperCase()}</li>
                  <li><strong>Scheduled Time:</strong> ${sessionDateTime.toLocaleString()}</li>
                  <li><strong>Duration:</strong> ${duration_minutes} minutes</li>
                  <li><strong>Amount Paid:</strong> ₹${booking.amount}</li>
                </ul>
              </div>

              <div class="warning">
                <strong>⏰ Important:</strong> Your session link is valid for ${linkValidityHours} hours from the scheduled time. Even if you join late, you'll get the full ${duration_minutes} minutes of session time.
              </div>

              <div style="text-align: center;">
                <a href="${userSessionLink}" class="button">🎥 Join Session</a>
                <p style="font-size: 12px; color: #6b7280;">Or copy this link: <br/><code>${userSessionLink}</code></p>
              </div>

              <p><strong>Before the session:</strong></p>
              <ul>
                <li>Test your camera and microphone (for video/voice calls)</li>
                <li>Use a stable internet connection</li>
                <li>Join from a quiet location</li>
                <li>Keep your session link secure and don't share it</li>
              </ul>

              <p>Thank you for choosing AstroTalk!</p>
            </div>
            <div class="footer">
              <p>Need help? Contact us at help@astrotalk.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
  } catch (emailErr) {
    console.error("[bookings/create] User email error:", emailErr)
  }

  // Send email to astrologer
  try {
    const linkValidityHours = webrtcSession ? Math.floor(webrtcSession.validity_minutes / 60) : 0
    await sendEmail({
      to: astrologer.email,
      subject: "New Booking - AstroTalk",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ea580c, #f97316); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; background: #ea580c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New Booking Received!</h1>
            </div>
            <div class="content">
              <p>Hello ${astrologer.name},</p>
              <p>You have a new ${session_type} session booking.</p>

              <div class="details">
                <h3>📋 Booking Details</h3>
                <ul>
                  <li><strong>Reference:</strong> ${booking.booking_reference}</li>
                  <li><strong>Session Type:</strong> ${session_type.toUpperCase()}</li>
                  <li><strong>Scheduled Time:</strong> ${sessionDateTime.toLocaleString()}</li>
                  <li><strong>Duration:</strong> ${duration_minutes} minutes</li>
                  <li><strong>Client:</strong> ${user.full_name || user.email}</li>
                  <li><strong>Amount:</strong> ₹${booking.amount}</li>
                </ul>
              </div>

              <div class="info">
                <strong>ℹ️ Session Link Validity:</strong> Your link is valid for ${linkValidityHours} hours from the scheduled time. The timer starts only when both you and the client join.
              </div>

              <div style="text-align: center;">
                <a href="${astrologerSessionLink}" class="button">🎥 Join Session</a>
                <p style="font-size: 12px; color: #6b7280;">Or copy this link: <br/><code>${astrologerSessionLink}</code></p>
              </div>

              <p><strong>Before the session:</strong></p>
              <ul>
                <li>Review client requirements if any</li>
                <li>Test your camera and microphone (for video/voice calls)</li>
                <li>Ensure stable internet connection</li>
                <li>Join from a quiet, professional environment</li>
                <li>Be ready 5 minutes before scheduled time</li>
              </ul>

              <p>Please prepare for this session accordingly.</p>
            </div>
            <div class="footer">
              <p>Questions? Contact support at support@astrotalk.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
  } catch (emailErr) {
    console.error("[bookings/create] Astrologer email error:", emailErr)
  }

  // Update notification flags
  await supabase
    .from("bookings")
    .update({
      user_notified: true,
      astrologer_notified: true,
    })
    .eq("id", booking.id)
}

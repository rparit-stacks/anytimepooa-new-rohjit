import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { sendOTP } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if astrologer exists
    const query = supabase
      .from("astrologers")
      .select("id, name, phone, email, status")
      .eq("email", email)

    const { data: astrologer, error: astrologerError } = await query.maybeSingle()

    if (astrologerError) {
      console.error("[astrologer/send-otp] Error:", astrologerError)
      return NextResponse.json(
        { error: "Failed to check astrologer" },
        { status: 500 }
      )
    }

    if (!astrologer) {
      return NextResponse.json(
        { error: "Astrologer not found. Please contact admin." },
        { status: 404 }
      )
    }

    if (astrologer.status !== "active") {
      return NextResponse.json(
        { error: "Your account is not active. Please contact admin." },
        { status: 403 }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP (expires in 10 minutes)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    const { error: otpError } = await supabase
      .from("astrologer_otp_verifications")
      .insert({
        phone: null,
        email: email,
        otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
      })

    if (otpError) {
      console.error("[astrologer/send-otp] OTP insert error:", otpError)
      return NextResponse.json(
        { error: "Failed to send OTP" },
        { status: 500 }
      )
    }

    // Send OTP via email
    const emailSent = await sendOTP(email, otp)

    if (!emailSent) {
      console.error("[astrologer/send-otp] Failed to send email OTP to:", email)
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again." },
        { status: 500 }
      )
    }

    console.log(`[astrologer/send-otp] OTP email sent successfully to: ${email}`)

    // In development, return OTP (remove in production)
    const isDev = process.env.NODE_ENV === "development"

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      ...(isDev && { otp }), // Only in development
      expiresIn: 600, // 10 minutes in seconds
    })
  } catch (error: any) {
    console.error("[astrologer/send-otp] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

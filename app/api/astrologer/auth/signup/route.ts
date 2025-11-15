import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { sendOTP } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      specialization,
      experience_years,
      languages,
      rate_per_session,
      bio,
    } = body

    // Validation
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    if (phone.length !== 10) {
      return NextResponse.json(
        { error: "Phone number must be 10 digits" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if astrologer already exists
    const { data: existingAstrologer } = await supabase
      .from("astrologers")
      .select("id, email, phone")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle()

    if (existingAstrologer) {
      if (existingAstrologer.email === email) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        )
      }
      if (existingAstrologer.phone === phone) {
        return NextResponse.json(
          { error: "An account with this phone number already exists" },
          { status: 400 }
        )
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP (expires in 10 minutes)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Store signup data temporarily with OTP
    const { error: otpError } = await supabase
      .from("astrologer_otp_verifications")
      .insert({
        email,
        phone: null,
        otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
        metadata: {
          name,
          phone,
          specialization,
          experience_years: experience_years ? parseInt(experience_years) : null,
          languages,
          rate_per_session: rate_per_session ? parseFloat(rate_per_session) : null,
          bio,
          signup: true, // Flag to indicate this is a signup OTP
        },
      })

    if (otpError) {
      console.error("[astrologer/signup] OTP insert error:", otpError)
      return NextResponse.json(
        { error: "Failed to send OTP" },
        { status: 500 }
      )
    }

    // Send OTP via email
    const emailSent = await sendOTP(email, otp)

    if (!emailSent) {
      console.error("[astrologer/signup] Failed to send email OTP to:", email)
      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again." },
        { status: 500 }
      )
    }

    console.log(`[astrologer/signup] OTP email sent successfully to: ${email}`)

    // In development, return OTP (remove in production)
    const isDev = process.env.NODE_ENV === "development"

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      ...(isDev && { otp }), // Only in development
      expiresIn: 600, // 10 minutes in seconds
    })
  } catch (error: any) {
    console.error("[astrologer/signup] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

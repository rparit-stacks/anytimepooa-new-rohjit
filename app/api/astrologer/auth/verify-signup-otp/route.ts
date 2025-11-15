import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!otp) {
      return NextResponse.json(
        { error: "OTP is required" },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find OTP record for signup
    const { data: otpRecord, error: otpError } = await supabase
      .from("astrologer_otp_verifications")
      .select("*")
      .eq("otp", otp)
      .eq("email", email)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (otpError) {
      console.error("[astrologer/verify-signup-otp] Error:", otpError)
      return NextResponse.json(
        { error: "Failed to verify OTP" },
        { status: 500 }
      )
    }

    if (!otpRecord) {
      // Increment attempts - get current attempts first
      const { data: currentOtp } = await supabase
        .from("astrologer_otp_verifications")
        .select("attempts")
        .eq("otp", otp)
        .eq("verified", false)
        .maybeSingle()

      if (currentOtp) {
        await supabase
          .from("astrologer_otp_verifications")
          .update({ attempts: (currentOtp.attempts || 0) + 1 })
          .eq("otp", otp)
          .eq("verified", false)
      }

      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      )
    }

    // Check if this is a signup OTP
    if (!otpRecord.metadata || !otpRecord.metadata.signup) {
      return NextResponse.json(
        { error: "This OTP is not for signup. Please use the login page." },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await supabase
      .from("astrologer_otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id)

    // Extract signup data from metadata
    const {
      name,
      phone,
      specialization,
      experience_years,
      languages,
      rate_per_session,
      bio,
    } = otpRecord.metadata

    // Check if astrologer already exists (double check)
    const { data: existingAstrologer } = await supabase
      .from("astrologers")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingAstrologer) {
      return NextResponse.json(
        { error: "Account already exists. Please login instead." },
        { status: 400 }
      )
    }

    // Create astrologer account
    // Ensure languages is an array (handle both string and array inputs)
    let languagesArray = null
    if (languages) {
      if (typeof languages === 'string') {
        // If it's a string, convert to array
        languagesArray = [languages]
      } else if (Array.isArray(languages)) {
        languagesArray = languages
      }
    }

    const { data: newAstrologer, error: createError } = await supabase
      .from("astrologers")
      .insert({
        name,
        email,
        phone,
        specialization: specialization || null,
        experience_years: experience_years || null,
        languages: languagesArray,
        rate_per_session: rate_per_session || null,
        bio: bio || null,
        status: "pending", // Needs admin approval
        rating: 0,
        total_reviews: 0,
      })
      .select()
      .single()

    if (createError || !newAstrologer) {
      console.error("[astrologer/verify-signup-otp] Create error:", createError)
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      )
    }

    // Initialize wallet for the astrologer
    await supabase.from("astrologer_wallets").insert({
      astrologer_id: newAstrologer.id,
      balance: 0,
      total_earnings: 0,
      pending_amount: 0,
      available_balance: 0,
      total_withdrawn: 0,
    })

    // Generate session token
    const sessionToken = `ast_${newAstrologer.id}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    // Create session (expires in 30 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: sessionError } = await supabase
      .from("astrologer_sessions")
      .insert({
        astrologer_id: newAstrologer.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
        device_info: request.headers.get("user-agent"),
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      })

    if (sessionError) {
      console.error("[astrologer/verify-signup-otp] Session creation error:", sessionError)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set("astrologer_session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    })

    // Return astrologer data (without sensitive fields)
    return NextResponse.json({
      success: true,
      message: "Account created successfully! Pending admin approval.",
      astrologer: {
        id: newAstrologer.id,
        name: newAstrologer.name,
        email: newAstrologer.email,
        phone: newAstrologer.phone,
        status: newAstrologer.status,
        specialization: newAstrologer.specialization,
      },
      token: sessionToken,
    })
  } catch (error: any) {
    console.error("[astrologer/verify-signup-otp] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

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

    // Find OTP record
    const otpQuery = supabase
      .from("astrologer_otp_verifications")
      .select("*")
      .eq("otp", otp)
      .eq("email", email)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())

    const { data: otpRecord, error: otpError } = await otpQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (otpError) {
      console.error("[astrologer/verify-otp] Error:", otpError)
      return NextResponse.json(
        { error: "Failed to verify OTP" },
        { status: 500 }
      )
    }

    if (!otpRecord) {
      // Increment attempts
      await supabase
        .from("astrologer_otp_verifications")
        .update({ attempts: supabase.rpc("increment", { field: "attempts" }) })
        .match({ otp, verified: false })

      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await supabase
      .from("astrologer_otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id)

    // Get astrologer details
    const astrologerQuery = supabase
      .from("astrologers")
      .select("*")
      .eq("email", email)

    const { data: astrologer, error: astrologerError } = await astrologerQuery.single()

    if (astrologerError || !astrologer) {
      console.error("[astrologer/verify-otp] Astrologer not found:", astrologerError)
      return NextResponse.json(
        { error: "Astrologer not found" },
        { status: 404 }
      )
    }

    // Generate session token
    const sessionToken = `ast_${astrologer.id}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    // Create session (expires in 30 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: sessionError } = await supabase
      .from("astrologer_sessions")
      .insert({
        astrologer_id: astrologer.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
        device_info: request.headers.get("user-agent"),
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      })

    if (sessionError) {
      console.error("[astrologer/verify-otp] Session creation error:", sessionError)
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
    const { password, ...astrologerData } = astrologer

    return NextResponse.json({
      success: true,
      message: "Login successful",
      astrologer: astrologerData,
      token: sessionToken,
    })
  } catch (error: any) {
    console.error("[astrologer/verify-otp] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

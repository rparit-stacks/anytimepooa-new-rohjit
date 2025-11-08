import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { sendOTP } from "@/lib/email"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { email, password, step, otp } = body
    console.log("[v0] Login step:", step, "for email:", email)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      },
    )

    if (step === "verify-credentials") {
      const { data: user, error: userError } = await supabase.from("users").select("*").eq("email", email).single()

      if (userError || !user) {
        console.error("[v0] User not found:", email)
        return NextResponse.json({ error: "User not found" }, { status: 401 })
      }

      // Simple password comparison (in production, use bcrypt)
      if (user.password !== password) {
        console.error("[v0] Invalid password for:", email)
        return NextResponse.json({ error: "Invalid password" }, { status: 401 })
      }

      // Generate and send OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      // Delete old OTPs for this email first
      await supabase.from("otps").delete().eq("email", email)

      // Insert new OTP
      const { error: otpInsertError } = await supabase.from("otps").insert({
        email,
        otp: otpCode,
        expires_at: expiresAt.toISOString(),
        verified: false,
      })

      if (otpInsertError) {
        console.error("[v0] Error inserting OTP:", otpInsertError)
        return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 })
      }

      console.log("[v0] OTP generated and saved for:", email, "OTP:", otpCode)

      const emailSent = await sendOTP(email, otpCode)
      if (!emailSent) {
        return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
      }

      console.log("[v0] Login OTP sent to:", email)
      return NextResponse.json({ success: true, message: "OTP sent to email" })
    }

    if (step === "verify-otp") {
      if (!otp) {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 })
      }

      console.log("[v0] Verifying OTP for email:", email, "OTP:", otp)

      // Check OTP in database - try 'otp' column first, then 'code' as fallback
      let otpData = null
      let otpError = null

      // Try with 'otp' column first
      const { data: otpData1, error: error1 } = await supabase
        .from("otps")
        .select("*")
        .eq("email", email)
        .eq("otp", otp)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle()

      if (otpData1) {
        otpData = otpData1
      } else {
        // Try with 'code' column as fallback
        const { data: otpData2, error: error2 } = await supabase
          .from("otps")
          .select("*")
          .eq("email", email)
          .eq("code", otp)
          .eq("verified", false)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle()
        
        if (otpData2) {
          otpData = otpData2
        } else {
          otpError = error2 || error1
        }
      }

      if (otpError) {
        console.error("[v0] OTP verification error:", otpError)
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 })
      }

      if (!otpData) {
        console.error("[v0] OTP not found for email:", email, "OTP:", otp)
        // Check if OTP exists but is already verified or expired
        const { data: existingOtp } = await supabase
          .from("otps")
          .select("*")
          .eq("email", email)
          .or(`otp.eq.${otp},code.eq.${otp}`)
          .maybeSingle()
        
        if (existingOtp) {
          if (existingOtp.verified) {
            return NextResponse.json({ error: "OTP has already been used" }, { status: 401 })
          }
          if (new Date(existingOtp.expires_at) <= new Date()) {
            return NextResponse.json({ error: "OTP has expired" }, { status: 401 })
          }
        }
        return NextResponse.json({ error: "Invalid OTP" }, { status: 401 })
      }

      console.log("[v0] OTP verified successfully for:", email)

      await supabase.from("otps").update({ verified: true }).eq("id", otpData.id)

      // Get user data
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single()

      if (userError || !user) {
        console.error("[v0] User not found after OTP verification:", email)
        return NextResponse.json({ error: "User not found" }, { status: 401 })
      }

      // Create session token
      const sessionToken = crypto.randomUUID()
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      // Delete old sessions for this user
      await supabase.from("sessions").delete().eq("user_id", user.id)

      // Create new session
      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
      })

      if (sessionError) {
        console.error("[v0] Error creating session:", sessionError)
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
      }

      // Set session token cookie using NextResponse
      const response = NextResponse.json({ 
        success: true, 
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        }
      })

      // Set cookie in response headers for production compatibility
      const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
      response.cookies.set("session_token", sessionToken, {
        httpOnly: true,
        secure: isProduction, // true for HTTPS in production
        sameSite: "lax",
        expires: sessionExpiresAt,
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      })
      
      console.log("[v0] Session cookie set for user:", user.id, "| Token:", sessionToken.substring(0, 8) + "...", "| Secure:", isProduction)

      console.log("[v0] User logged in successfully:", email, "| Redirecting to dashboard")
      return response
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 })
  }
}

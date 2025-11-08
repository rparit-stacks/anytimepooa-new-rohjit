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
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("[LOGIN FLOW] 🚀 STEP 1: OTP VERIFICATION STARTED")
      console.log("[LOGIN FLOW] Email:", email)
      console.log("[LOGIN FLOW] OTP:", otp)
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      
      if (!otp) {
        console.log("[LOGIN FLOW] ❌ ERROR: OTP is required")
        return NextResponse.json({ error: "OTP is required" }, { status: 400 })
      }

      console.log("[LOGIN FLOW] ✅ OTP provided, verifying in database...")

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

      console.log("[LOGIN FLOW] ✅ STEP 2: OTP VERIFIED SUCCESSFULLY")
      console.log("[LOGIN FLOW] OTP Data ID:", otpData.id)

      await supabase.from("otps").update({ verified: true }).eq("id", otpData.id)
      console.log("[LOGIN FLOW] ✅ OTP marked as verified in database")

      // Get user data
      console.log("[LOGIN FLOW] 🚀 STEP 3: FETCHING USER DATA...")
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single()

      if (userError || !user) {
        console.log("[LOGIN FLOW] ❌ ERROR: User not found after OTP verification")
        console.log("[LOGIN FLOW] Error:", userError?.message || "No user data")
        return NextResponse.json({ error: "User not found" }, { status: 401 })
      }

      console.log("[LOGIN FLOW] ✅ STEP 4: USER FOUND")
      console.log("[LOGIN FLOW] User ID:", user.id)
      console.log("[LOGIN FLOW] User Email:", user.email)

      // Create session token
      console.log("[LOGIN FLOW] 🚀 STEP 5: CREATING SESSION...")
      const sessionToken = crypto.randomUUID()
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      console.log("[LOGIN FLOW] Session Token:", sessionToken.substring(0, 20) + "...")
      console.log("[LOGIN FLOW] Session Expires At:", sessionExpiresAt.toISOString())

      // Delete old sessions for this user
      console.log("[LOGIN FLOW] Deleting old sessions for user...")
      const deleteResult = await supabase.from("sessions").delete().eq("user_id", user.id)
      console.log("[LOGIN FLOW] Old sessions deleted:", deleteResult.error ? "Error" : "Success")

      // Create new session
      console.log("[LOGIN FLOW] Inserting new session into database...")
      const { data: newSession, error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
      }).select().single()

      if (sessionError || !newSession) {
        console.log("[LOGIN FLOW] ❌ ERROR: Failed to create session in database")
        console.log("[LOGIN FLOW] Session Error:", sessionError?.message || "Unknown error")
        console.log("[LOGIN FLOW] Session Data:", newSession)
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
      }

      console.log("[LOGIN FLOW] ✅ STEP 6: SESSION CREATED IN DATABASE")
      console.log("[LOGIN FLOW] Session ID:", newSession.id)
      console.log("[LOGIN FLOW] Session User ID:", newSession.user_id)

      // Set session token cookie using NextResponse
      console.log("[LOGIN FLOW] 🚀 STEP 7: SETTING COOKIE...")
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
      
      // Get the request origin to set proper domain
      const origin = request.headers.get("origin") || request.headers.get("referer") || ""
      const host = request.headers.get("host") || ""
      
      console.log("[LOGIN FLOW] Environment Check:")
      console.log("[LOGIN FLOW]   - NODE_ENV:", process.env.NODE_ENV)
      console.log("[LOGIN FLOW]   - VERCEL:", process.env.VERCEL)
      console.log("[LOGIN FLOW]   - Is Production:", isProduction)
      console.log("[LOGIN FLOW]   - Host:", host)
      console.log("[LOGIN FLOW]   - Origin:", origin)
      
      const cookieOptions: any = {
        httpOnly: true,
        secure: isProduction, // true for HTTPS in production
        sameSite: "lax" as const,
        expires: sessionExpiresAt,
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        // Don't set domain - let browser handle it automatically
        // Setting domain can cause issues with Vercel deployments
      }
      
      console.log("[LOGIN FLOW] Cookie Options:", JSON.stringify(cookieOptions, null, 2))
      
      // Set cookie using NextResponse cookies API
      response.cookies.set("session_token", sessionToken, cookieOptions)
      console.log("[LOGIN FLOW] ✅ Cookie set using response.cookies.set()")
      
      // Also set cookie in response headers directly as backup
      const setCookieValue = `session_token=${sessionToken}; Path=/; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}; Expires=${sessionExpiresAt.toUTCString()}`
      response.headers.append("Set-Cookie", setCookieValue)
      console.log("[LOGIN FLOW] ✅ Cookie also set using headers.append()")
      
      // Verify cookie was set
      const setCookieHeader = response.headers.get("set-cookie")
      console.log("[LOGIN FLOW] Set-Cookie Header Value:", setCookieHeader)
      console.log("[LOGIN FLOW] All Set-Cookie Headers:", response.headers.getSetCookie())
      
      if (!setCookieHeader && response.headers.getSetCookie().length === 0) {
        console.log("[LOGIN FLOW] ⚠️  WARNING: Cookie header not found in response!")
      } else {
        console.log("[LOGIN FLOW] ✅ Cookie header confirmed in response")
      }

      console.log("[LOGIN FLOW] ✅ STEP 8: LOGIN COMPLETE - RETURNING RESPONSE")
      console.log("[LOGIN FLOW] Response Status: 200")
      console.log("[LOGIN FLOW] Response will include cookie in Set-Cookie header")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      return response
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 })
  }
}

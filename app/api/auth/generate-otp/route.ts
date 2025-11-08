import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { sendOTP } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { email } = body
    console.log("[v0] Generate OTP for email:", email)

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

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

    // Delete old OTPs for this email first
    await supabase.from("otps").delete().eq("email", email)

    // Insert new OTP
    const { error: dbError } = await supabase.from("otps").insert({
      email,
      otp: otp,
      expires_at: expiresAt.toISOString(),
      verified: false,
    })

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      throw dbError
    }

    console.log("[v0] OTP generated and saved for:", email, "OTP:", otp)

    const emailSent = await sendOTP(email, otp)
    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 })
    }

    console.log("[v0] OTP generated and sent successfully")
    return NextResponse.json({ success: true, message: "OTP sent to email" })
  } catch (error) {
    console.error("[v0] OTP generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate OTP" },
      { status: 500 },
    )
  }
}

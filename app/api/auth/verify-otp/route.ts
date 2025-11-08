import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { email, otp } = body
    console.log("[v0] Verifying OTP for email:", email)

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

    const { data, error } = await supabase
      .from("otps")
      .select("*")
      .eq("email", email)
      .eq("otp", otp)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (error || !data) {
      console.error("[v0] OTP verification failed:", error)
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 })
    }

    await supabase.from("otps").update({ verified: true }).eq("id", data.id)

    console.log("[v0] OTP verified successfully")
    return NextResponse.json({ success: true, message: "OTP verified" })
  } catch (error) {
    console.error("[v0] OTP verification error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify OTP" },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { email, password, full_name, kundli } = body
    console.log("[v0] Signup with kundli for email:", email)
    console.log("[v0] Received data:", { email, full_name, kundli })

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

    const insertData: any = {
      email,
      password_hash: password, // In production, hash this with bcrypt
      password: password, // Also store in password field for login compatibility
      created_at: new Date().toISOString(),
    }

    // Add full_name if provided
    if (full_name) {
      insertData.full_name = full_name
    }

    // Add kundli data if provided
    if (kundli) {
      if (kundli.birthDate) insertData.birth_date = kundli.birthDate
      if (kundli.birthTime) insertData.birth_time = kundli.birthTime
      if (kundli.birthPlace) insertData.birth_place = kundli.birthPlace
      if (kundli.gender) insertData.gender = kundli.gender
      if (kundli.maritalStatus) insertData.marital_status = kundli.maritalStatus
    }

    console.log("[v0] Inserting data:", insertData)

    const { data: user, error: insertError } = await supabase
      .from("users")
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Signup error:", insertError)
      return NextResponse.json({ error: insertError.message || "Email already exists" }, { status: 400 })
    }

    // Create session token for new user
    const sessionToken = crypto.randomUUID()
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const { error: sessionError } = await supabase.from("sessions").insert({
      user_id: user.id,
      token: sessionToken,
      expires_at: sessionExpiresAt.toISOString(),
    })

    if (sessionError) {
      console.error("[v0] Error creating session:", sessionError)
    }

    // Set session token cookie
    const cookieStore = await cookies()
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: sessionExpiresAt,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    })

    console.log("[v0] User created successfully:", email)
    return NextResponse.json({ 
      success: true, 
      message: "Account created",
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      }
    })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Signup failed" }, { status: 500 })
  }
}

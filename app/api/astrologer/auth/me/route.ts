import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from("astrologer_sessions")
      .select("*")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      )
    }

    // Update last active
    await supabase
      .from("astrologer_sessions")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", session.id)

    // Get astrologer details with wallet
    const { data: astrologer, error: astrologerError } = await supabase
      .from("astrologers")
      .select(`
        *,
        wallet:astrologer_wallet_balance(balance, total_earnings, pending_amount)
      `)
      .eq("id", session.astrologer_id)
      .single()

    if (astrologerError || !astrologer) {
      return NextResponse.json(
        { error: "Astrologer not found" },
        { status: 404 }
      )
    }

    // Remove sensitive data
    const { password, ...astrologerData } = astrologer

    return NextResponse.json({
      success: true,
      astrologer: astrologerData,
    })
  } catch (error: any) {
    console.error("[astrologer/me] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

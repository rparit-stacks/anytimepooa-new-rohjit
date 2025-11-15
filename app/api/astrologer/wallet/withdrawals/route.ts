import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: session } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { data: withdrawals, error } = await supabase
      .from("astrologer_withdrawals")
      .select("*")
      .eq("astrologer_id", session.astrologer_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[astrologer/wallet/withdrawals] Error:", error)
      return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 })
    }

    return NextResponse.json({ success: true, withdrawals: withdrawals || [] })
  } catch (error: any) {
    console.error("[astrologer/wallet/withdrawals] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

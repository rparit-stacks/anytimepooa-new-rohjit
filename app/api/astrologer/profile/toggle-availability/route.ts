import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { is_available } = body

    // Update availability status
    const { data: astrologer, error } = await supabase
      .from("astrologers")
      .update({
        is_available: is_available,
        updated_at: new Date().toISOString()
      })
      .eq("id", session.astrologer_id)
      .select("is_available")
      .single()

    if (error) {
      console.error("[astrologer/profile/toggle-availability] Error:", error)
      return NextResponse.json({ error: "Failed to update availability" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      is_available: astrologer.is_available
    })
  } catch (error: any) {
    console.error("[astrologer/profile/toggle-availability] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

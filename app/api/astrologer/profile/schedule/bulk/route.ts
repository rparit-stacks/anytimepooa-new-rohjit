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
    const { slots } = body

    // Delete existing schedule
    await supabase
      .from("astrologer_availability_schedule")
      .delete()
      .eq("astrologer_id", session.astrologer_id)

    // Insert new slots
    const slotsToInsert = slots.map((slot: any) => ({
      astrologer_id: session.astrologer_id,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: slot.is_available !== false,
    }))

    const { error } = await supabase
      .from("astrologer_availability_schedule")
      .insert(slotsToInsert)

    if (error) {
      console.error("[astrologer/profile/schedule/bulk] Error:", error)
      return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[astrologer/profile/schedule/bulk] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

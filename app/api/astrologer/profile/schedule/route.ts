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

    const { data: schedule, error } = await supabase
      .from("astrologer_availability_schedule")
      .select("*")
      .eq("astrologer_id", session.astrologer_id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[astrologer/profile/schedule] Error:", error)
      return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
    }

    return NextResponse.json({ success: true, schedule: schedule || [] })
  } catch (error: any) {
    console.error("[astrologer/profile/schedule] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

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
    const { day_of_week, start_time, end_time, is_available } = body

    const { data: slot, error } = await supabase
      .from("astrologer_availability_schedule")
      .insert({
        astrologer_id: session.astrologer_id,
        day_of_week,
        start_time,
        end_time,
        is_available: is_available !== false,
      })
      .select()
      .single()

    if (error) {
      console.error("[astrologer/profile/schedule] Error:", error)
      return NextResponse.json({ error: "Failed to add time slot" }, { status: 500 })
    }

    return NextResponse.json({ success: true, slot })
  } catch (error: any) {
    console.error("[astrologer/profile/schedule] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

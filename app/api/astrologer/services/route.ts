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

    // Get astrologer from session
    const { data: session } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Get services
    const { data: services, error } = await supabase
      .from("astrologer_services")
      .select("*")
      .eq("astrologer_id", session.astrologer_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[astrologer/services] Error:", error)
      return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
    }

    return NextResponse.json({ success: true, services: services || [] })
  } catch (error: any) {
    console.error("[astrologer/services] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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
    const { service_type, is_enabled, rate_per_minute, minimum_duration, description } = body

    // Check if service exists
    const { data: existing } = await supabase
      .from("astrologer_services")
      .select("id")
      .eq("astrologer_id", session.astrologer_id)
      .eq("service_type", service_type)
      .single()

    let result

    if (existing) {
      // Update existing service
      const updateData: any = { updated_at: new Date().toISOString() }
      if (is_enabled !== undefined) updateData.is_enabled = is_enabled
      if (rate_per_minute !== undefined) updateData.rate_per_minute = rate_per_minute
      if (minimum_duration !== undefined) updateData.minimum_duration = minimum_duration
      if (description !== undefined) updateData.description = description

      const { data, error } = await supabase
        .from("astrologer_services")
        .update(updateData)
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new service
      const { data, error } = await supabase
        .from("astrologer_services")
        .insert({
          astrologer_id: session.astrologer_id,
          service_type,
          is_enabled: is_enabled !== undefined ? is_enabled : true,
          rate_per_minute: rate_per_minute || 0,
          minimum_duration: minimum_duration || 5,
          description,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ success: true, service: result })
  } catch (error: any) {
    console.error("[astrologer/services/update] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

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
    const {
      name,
      phone,
      specialization,
      specializations,
      experience_years,
      languages,
      rate_per_session,
      rate_video_per_minute,
      rate_session_per_minute,
      rate_chat_per_minute,
      bio,
      location,
      city,
      state,
      country,
    } = body

    // Prepare languages array
    let languagesArray = []
    if (Array.isArray(languages)) {
      languagesArray = languages
    } else if (languages && typeof languages === 'string') {
      languagesArray = languages.split(',').map((l: string) => l.trim()).filter((l: string) => l)
    }

    // Prepare specializations array
    let specializationsArray = []
    if (Array.isArray(specializations)) {
      specializationsArray = specializations
    } else if (specialization && typeof specialization === 'string') {
      specializationsArray = [specialization]
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (specialization !== undefined) updateData.specialization = specialization
    if (specializationsArray.length > 0) updateData.specializations = specializationsArray
    if (experience_years !== undefined) updateData.experience_years = experience_years ? parseInt(experience_years) : null
    if (languagesArray.length > 0) updateData.languages = languagesArray
    if (bio !== undefined) updateData.bio = bio
    if (location !== undefined) updateData.location = location
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (country !== undefined) updateData.country = country

    // Handle rates
    if (rate_per_session !== undefined) updateData.rate_per_session = rate_per_session ? parseFloat(rate_per_session) : null
    if (rate_video_per_minute !== undefined) updateData.rate_video_per_minute = rate_video_per_minute ? parseFloat(rate_video_per_minute) : null
    if (rate_session_per_minute !== undefined) updateData.rate_session_per_minute = rate_session_per_minute ? parseFloat(rate_session_per_minute) : null
    if (rate_chat_per_minute !== undefined) updateData.rate_chat_per_minute = rate_chat_per_minute ? parseFloat(rate_chat_per_minute) : null

    // Update profile
    const { data: astrologer, error } = await supabase
      .from("astrologers")
      .update(updateData)
      .eq("id", session.astrologer_id)
      .select()
      .single()

    if (error) {
      console.error("[astrologer/profile/update] Error:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, astrologer })
  } catch (error: any) {
    console.error("[astrologer/profile/update] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

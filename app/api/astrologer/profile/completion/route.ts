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

    // Call the database function to calculate profile completion
    const { data, error } = await supabase
      .rpc('calculate_astrologer_profile_completion', {
        p_astrologer_id: session.astrologer_id
      })

    if (error) {
      console.error("[astrologer/profile/completion] Error:", error)
      // Return a manual calculation if the function doesn't exist yet
      return await calculateManually(supabase, session.astrologer_id)
    }

    return NextResponse.json({
      success: true,
      completion: data || 0
    })
  } catch (error: any) {
    console.error("[astrologer/profile/completion] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// Fallback manual calculation
async function calculateManually(supabase: any, astrologerId: string) {
  try {
    const { data: astrologer } = await supabase
      .from("astrologers")
      .select("*")
      .eq("id", astrologerId)
      .single()

    if (!astrologer) {
      return NextResponse.json({ completion: 0 })
    }

    const totalFields = 20
    let filledFields = 0

    // Basic fields
    if (astrologer.name) filledFields++
    if (astrologer.email) filledFields++
    if (astrologer.phone) filledFields++
    if (astrologer.bio) filledFields++
    if (astrologer.specialization) filledFields++
    if (astrologer.experience_years) filledFields++
    if (astrologer.languages && astrologer.languages.length > 0) filledFields++
    if (astrologer.profile_picture_url) filledFields++
    if (astrologer.location) filledFields++
    if (astrologer.city) filledFields++

    // Rates (at least one)
    if (astrologer.rate_video_per_minute || astrologer.rate_session_per_minute || astrologer.rate_chat_per_minute) {
      filledFields += 2
    }

    // Check bank details
    const { data: bankDetails } = await supabase
      .from("astrologer_bank_details")
      .select("id")
      .eq("astrologer_id", astrologerId)
      .limit(1)
      .single()

    if (bankDetails) filledFields += 2

    // Check schedule
    const { data: schedule } = await supabase
      .from("astrologer_availability_schedule")
      .select("id")
      .eq("astrologer_id", astrologerId)
      .limit(1)
      .single()

    if (schedule) filledFields += 2

    // Check services
    const { data: services } = await supabase
      .from("astrologer_services")
      .select("id")
      .eq("astrologer_id", astrologerId)
      .limit(1)
      .single()

    if (services) filledFields += 2

    const completion = Math.round((filledFields / totalFields) * 100)

    return NextResponse.json({
      success: true,
      completion
    })
  } catch (error) {
    return NextResponse.json({ completion: 0 })
  }
}

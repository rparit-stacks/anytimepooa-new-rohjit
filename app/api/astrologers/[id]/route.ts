import { createClient } from "@/lib/server"

interface AvailabilityRecord {
  id: string
  astrologer_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
  created_at?: string
  updated_at?: string
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: astrologer, error } = await supabase.from("astrologers").select("*").eq("id", id).single()

    if (error || !astrologer) {
      const message = error?.message || "Astrologer not found"
      return Response.json({ error: message, data: null }, { status: error ? 400 : 404 })
    }

    const { data: availabilityData, error: availabilityError } = await supabase
      .from("astrologer_availability_schedule")
      .select("*")
      .eq("astrologer_id", id)
      .eq("is_available", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true })

    if (availabilityError) {
      console.error("[astrologer_availability_schedule] query error:", availabilityError)
    }

    const availability: AvailabilityRecord[] = availabilityData || []

    const toNumber = (value: unknown) => {
      if (value === null || value === undefined) return null
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : null
    }

    const { password_hash: _passwordHash, ...rest } = astrologer as Record<string, any>
    const safeAstrologer = {
      ...rest,
      languages: Array.isArray(rest.languages)
        ? rest.languages
        : typeof rest.languages === "string" && rest.languages.length > 0
          ? rest.languages.split(",").map((lang: string) => lang.trim())
          : [],
      price_per_session: toNumber(rest.price_per_session),
      rate_session_per_minute: toNumber(rest.rate_session_per_minute),
      rate_video_per_minute: toNumber(rest.rate_video_per_minute),
      rate_chat_per_minute: toNumber(rest.rate_chat_per_minute),
    }

    return Response.json(
      {
        data: {
          ...safeAstrologer,
          availability,
        },
      },
      { status: 200 },
    )
  } catch (err: any) {
    return Response.json({ error: err.message, data: null }, { status: 500 })
  }
}

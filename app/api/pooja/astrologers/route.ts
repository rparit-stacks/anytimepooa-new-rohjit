import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"
import { NextRequest } from "next/server"

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { city, latitude, longitude, pooja_service_id } = body

    if (!city && (!latitude || !longitude)) {
      return Response.json({ error: "Location required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user location
    let userLat = latitude || user.latitude || 28.6139 // Default Delhi
    let userLng = longitude || user.longitude || 77.2090
    let userCity = city || user.city || user.location || ""

    // Fetch astrologers in same city
    let query = supabase.from("astrologers").select("*").eq("is_available", true)

    if (userCity) {
      query = query.ilike("location", `%${userCity}%`)
    }

    const { data: astrologers, error } = await query.order("rating", { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    // Calculate distance and filter nearby astrologers
    const astrologersWithDistance = (astrologers || [])
      .map((astro: any) => {
        let distance = null
        if (astro.latitude && astro.longitude) {
          distance = calculateDistance(userLat, userLng, astro.latitude, astro.longitude)
        }
        return {
          ...astro,
          distance_km: distance ? parseFloat(distance.toFixed(2)) : null,
        }
      })
      .filter((astro: any) => !astro.distance_km || astro.distance_km <= 50) // Within 50km
      .sort((a: any, b: any) => {
        if (a.distance_km && b.distance_km) {
          return a.distance_km - b.distance_km
        }
        return (b.rating || 0) - (a.rating || 0)
      })

    // Get pooja service price if provided
    let servicePrice = 0
    if (pooja_service_id) {
      const { data: service } = await supabase
        .from("pooja_services")
        .select("base_price")
        .eq("id", pooja_service_id)
        .single()
      servicePrice = service?.base_price || 0
    }

    // Add total price (service + astrologer fee)
    const astrologersWithPrice = astrologersWithDistance.map((astro: any) => ({
      ...astro,
      service_price: servicePrice,
      total_price: servicePrice + parseFloat(astro.price_per_session || 0),
    }))

    return Response.json({ data: astrologersWithPrice }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] Get pooja astrologers error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}



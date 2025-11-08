import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      pooja_service_id,
      astrologer_id,
      booking_date,
      booking_time,
      address,
      city,
      latitude,
      longitude,
      special_instructions,
    } = body

    // Validate required fields
    if (!pooja_service_id || !astrologer_id || !booking_date || !booking_time || !address || !city) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get pooja service
    const { data: service, error: serviceError } = await supabase
      .from("pooja_services")
      .select("*")
      .eq("id", pooja_service_id)
      .single()

    if (serviceError || !service) {
      return Response.json({ error: "Pooja service not found" }, { status: 404 })
    }

    // Get astrologer
    const { data: astrologer, error: astroError } = await supabase
      .from("astrologers")
      .select("*")
      .eq("id", astrologer_id)
      .single()

    if (astroError || !astrologer) {
      return Response.json({ error: "Astrologer not found" }, { status: 404 })
    }

    // Calculate total amount
    const servicePrice = parseFloat(service.base_price || 0)
    const astrologerPrice = parseFloat(astrologer.price_per_session || 0)
    const totalAmount = servicePrice + astrologerPrice

    // Calculate distance if coordinates available
    let distanceKm = null
    if (user.latitude && user.longitude && astrologer.latitude && astrologer.longitude) {
      const R = 6371 // Earth radius in km
      const dLat = ((astrologer.latitude - user.latitude) * Math.PI) / 180
      const dLon = ((astrologer.longitude - user.longitude) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((user.latitude * Math.PI) / 180) *
          Math.cos((astrologer.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      distanceKm = parseFloat((R * c).toFixed(2))
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("pooja_bookings")
      .insert({
        user_id: user.id,
        pooja_service_id,
        astrologer_id,
        booking_date,
        booking_time,
        address,
        city,
        latitude: latitude || user.latitude,
        longitude: longitude || user.longitude,
        total_amount: totalAmount,
        astrologer_price: astrologerPrice,
        service_price: servicePrice,
        distance_km: distanceKm,
        special_instructions,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (bookingError) {
      console.error("[v0] Booking error:", bookingError)
      return Response.json({ error: bookingError.message }, { status: 400 })
    }

    return Response.json({ data: booking }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] Book pooja error:", err)
    return Response.json({ error: err.message || "Failed to create booking" }, { status: 500 })
  }
}



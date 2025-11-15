import { createClient } from "@/lib/server"
import { cookies } from "next/headers"

// GET - List all pooja items or filter by location/astrologer
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const astrologerId = searchParams.get("astrologer_id")
    const latitude = searchParams.get("latitude")
    const longitude = searchParams.get("longitude")
    const maxDistance = parseFloat(searchParams.get("max_distance") || "50")

    // If location provided, get location-based items
    if (latitude && longitude) {
      const { data, error } = await supabase.rpc("get_pooja_items_by_location", {
        p_latitude: parseFloat(latitude),
        p_longitude: parseFloat(longitude),
        p_max_distance_km: maxDistance,
      })

      if (error) {
        console.error("[pooja/items] Location query error:", error)
        return Response.json(
          { error: "Failed to fetch location-based items", data: null },
          { status: 500 }
        )
      }

      return Response.json({ data: data || [] })
    }

    // Otherwise, get all items or filter by astrologer
    let query = supabase
      .from("pooja_items")
      .select(`
        *,
        astrologer:astrologers(id, name, location, avatar_url)
      `)
      .eq("is_available", true)

    if (astrologerId) {
      query = query.eq("astrologer_id", astrologerId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[pooja/items] Query error:", error)
      return Response.json(
        { error: "Failed to fetch pooja items", data: null },
        { status: 500 }
      )
    }

    return Response.json({ data: data || [] })
  } catch (err: any) {
    console.error("[pooja/items] Unexpected error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}

// POST - Create a new pooja item (astrologer only)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session_token")?.value

    if (!token) {
      return Response.json(
        { error: "Unauthorized", data: null },
        { status: 401 }
      )
    }

    // Note: In a real implementation, you would check if the user is an astrologer
    // For now, we assume the token is valid and get the user/astrologer ID

    const body = await request.json()
    const {
      name,
      description,
      image_url,
      price,
      duration_hours,
      category,
      stock_quantity,
      location_specific,
      max_distance_km,
      tags,
    } = body

    // Validate required fields
    if (!name || !price) {
      return Response.json(
        { error: "Name and price are required", data: null },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get astrologer ID from session
    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gte("expires_at", new Date().toISOString())
      .single()

    if (!session) {
      return Response.json(
        { error: "Invalid or expired session", data: null },
        { status: 401 }
      )
    }

    // Note: In production, verify this user_id belongs to an astrologer
    // For now, we'll use it as astrologer_id
    const astrologerId = session.user_id

    // Create pooja item
    const { data: item, error: itemError } = await supabase
      .from("pooja_items")
      .insert({
        astrologer_id: astrologerId,
        name,
        description,
        image_url,
        price,
        duration_hours: duration_hours || 2,
        category,
        stock_quantity: stock_quantity || 0,
        location_specific: location_specific || false,
        max_distance_km: max_distance_km || 50,
        tags: tags || [],
        is_available: true,
      })
      .select()
      .single()

    if (itemError) {
      console.error("[pooja/items] Creation error:", itemError)
      return Response.json(
        { error: "Failed to create pooja item", data: null },
        { status: 500 }
      )
    }

    return Response.json(
      {
        success: true,
        message: "Pooja item created successfully",
        data: item,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[pooja/items] POST error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}

import { createClient } from "@/lib/server"
import { cookies } from "next/headers"

// GET - Get single pooja item by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("pooja_items")
      .select(`
        *,
        astrologer:astrologers(id, name, location, avatar_url, latitude, longitude)
      `)
      .eq("id", id)
      .single()

    if (error || !data) {
      return Response.json(
        { error: "Pooja item not found", data: null },
        { status: 404 }
      )
    }

    return Response.json({ data })
  } catch (err: any) {
    console.error("[pooja/items/id] GET error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}

// PUT - Update pooja item (astrologer only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session_token")?.value

    if (!token) {
      return Response.json(
        { error: "Unauthorized", data: null },
        { status: 401 }
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

    // Verify ownership
    const { data: existingItem } = await supabase
      .from("pooja_items")
      .select("astrologer_id")
      .eq("id", id)
      .single()

    if (!existingItem || existingItem.astrologer_id !== session.user_id) {
      return Response.json(
        { error: "Not authorized to update this item", data: null },
        { status: 403 }
      )
    }

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
      is_available,
    } = body

    // Update pooja item
    const { data: item, error: updateError } = await supabase
      .from("pooja_items")
      .update({
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
        is_available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[pooja/items/id] Update error:", updateError)
      return Response.json(
        { error: "Failed to update pooja item", data: null },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      message: "Pooja item updated successfully",
      data: item,
    })
  } catch (err: any) {
    console.error("[pooja/items/id] PUT error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}

// DELETE - Delete pooja item (astrologer only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get("session_token")?.value

    if (!token) {
      return Response.json(
        { error: "Unauthorized", data: null },
        { status: 401 }
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

    // Verify ownership
    const { data: existingItem } = await supabase
      .from("pooja_items")
      .select("astrologer_id")
      .eq("id", id)
      .single()

    if (!existingItem || existingItem.astrologer_id !== session.user_id) {
      return Response.json(
        { error: "Not authorized to delete this item", data: null },
        { status: 403 }
      )
    }

    // Delete pooja item
    const { error: deleteError } = await supabase
      .from("pooja_items")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[pooja/items/id] Delete error:", deleteError)
      return Response.json(
        { error: "Failed to delete pooja item", data: null },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      message: "Pooja item deleted successfully",
    })
  } catch (err: any) {
    console.error("[pooja/items/id] DELETE error:", err)
    return Response.json(
      { error: err.message || "Internal server error", data: null },
      { status: 500 }
    )
  }
}

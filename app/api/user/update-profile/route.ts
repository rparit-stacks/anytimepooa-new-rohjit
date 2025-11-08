import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("users")
      .update({
        full_name: body.full_name,
        phone: body.phone,
        location: body.location,
        city: body.city,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message, data: null }, { status: 400 })
    }

    return Response.json({ data }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message, data: null }, { status: 500 })
  }
}

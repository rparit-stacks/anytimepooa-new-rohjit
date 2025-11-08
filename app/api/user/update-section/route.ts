import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { section } = await request.json()
    const supabase = await createClient()

    // Update user's preferred section in Postgres
    const { error } = await supabase.from("users").update({
      preferred_section: section,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id)

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: horoscopes, error } = await supabase
      .from("horoscopes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ data: horoscopes || [] }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] Get horoscope history error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}



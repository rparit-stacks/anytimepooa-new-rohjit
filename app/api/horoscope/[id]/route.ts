import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: horoscope, error } = await supabase
      .from("horoscopes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error || !horoscope) {
      return Response.json({ error: "Horoscope not found" }, { status: 404 })
    }

    return Response.json({ data: horoscope }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] Get horoscope error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}


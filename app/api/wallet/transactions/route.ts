import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return Response.json({ error: error.message, data: [] }, { status: 400 })
    }

    return Response.json({ data: data || [] }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message, data: [] }, { status: 500 })
  }
}

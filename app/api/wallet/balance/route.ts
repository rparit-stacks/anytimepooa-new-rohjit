import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.from("wallet_balance").select("balance").eq("user_id", user.id).single()

    if (error || !data) {
      return Response.json({ balance: 0 }, { status: 200 })
    }

    return Response.json({ balance: data.balance }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

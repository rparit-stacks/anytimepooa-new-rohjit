import { createClient } from "@/lib/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      return Response.json({ error: error.message, data: null }, { status: 400 })
    }

    if (!data || data.length === 0) {
      return Response.json({ message: "No offers found", data: [] }, { status: 200 })
    }

    return Response.json({ data }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message, data: null }, { status: 500 })
  }
}

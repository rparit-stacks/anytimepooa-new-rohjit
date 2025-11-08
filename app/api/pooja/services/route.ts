import { createClient } from "@/lib/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: services, error } = await supabase
      .from("pooja_services")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) {
      return Response.json({ error: error.message, data: null }, { status: 400 })
    }

    return Response.json({ data: services || [] }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] Get pooja services error:", err)
    return Response.json({ error: err.message, data: null }, { status: 500 })
  }
}



import { createClient } from "@/lib/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.from("astrologers").select("*").eq("id", id).single()

    if (error) {
      return Response.json({ error: error.message, data: null }, { status: 400 })
    }

    return Response.json({ data }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message, data: null }, { status: 500 })
  }
}

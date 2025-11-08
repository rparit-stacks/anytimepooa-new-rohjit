import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    return Response.json({ data: user }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message, data: null }, { status: 500 })
  }
}

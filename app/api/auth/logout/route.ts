import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCurrentUser, deleteSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session_token")?.value

    if (sessionToken) {
      await deleteSession(sessionToken)
    }

    // Clear session token cookie using NextResponse
    const response = NextResponse.json({ success: true, message: "Logged out successfully" })
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
    
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[v0] Logout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 },
    )
  }
}



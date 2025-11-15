import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (sessionToken) {
      const supabase = await createClient()

      // Delete session from database
      await supabase
        .from("astrologer_sessions")
        .delete()
        .eq("token", sessionToken)
    }

    // Clear cookie
    cookieStore.delete("astrologer_session_token")

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error: any) {
    console.error("[astrologer/logout] Unexpected error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

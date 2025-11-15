import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: session } = await supabase
      .from("astrologer_sessions")
      .select("astrologer_id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Get document details first
    const { data: document } = await supabase
      .from("astrologer_documents")
      .select("document_url")
      .eq("id", params.id)
      .eq("astrologer_id", session.astrologer_id)
      .single()

    if (document && document.document_url) {
      // Extract file path from URL and delete from storage
      try {
        const urlParts = document.document_url.split("/documents/")
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await supabase.storage.from("documents").remove([filePath])
        }
      } catch (storageError) {
        console.error("Failed to delete file from storage:", storageError)
      }
    }

    // Delete document record
    const { error } = await supabase
      .from("astrologer_documents")
      .delete()
      .eq("id", params.id)
      .eq("astrologer_id", session.astrologer_id)

    if (error) {
      console.error("[astrologer/profile/documents/delete] Error:", error)
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[astrologer/profile/documents/delete] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

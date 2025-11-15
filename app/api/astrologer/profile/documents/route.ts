import { createClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
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

    const { data: documents, error } = await supabase
      .from("astrologer_documents")
      .select("*")
      .eq("astrologer_id", session.astrologer_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[astrologer/profile/documents] Error:", error)
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }

    return NextResponse.json({ success: true, documents: documents || [] })
  } catch (error: any) {
    console.error("[astrologer/profile/documents] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const document_type = formData.get("document_type") as string
    const document_name = formData.get("document_name") as string
    const document_number = formData.get("document_number") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload file to Supabase storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${session.astrologer_id}/${document_type}_${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[astrologer/profile/documents/upload] Error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName)

    // Save document record
    const { data: document, error: docError } = await supabase
      .from("astrologer_documents")
      .insert({
        astrologer_id: session.astrologer_id,
        document_type,
        document_name,
        document_url: publicUrl,
        document_number,
        verification_status: "pending",
      })
      .select()
      .single()

    if (docError) {
      console.error("[astrologer/profile/documents/save] Error:", docError)
      return NextResponse.json({ error: "Failed to save document record" }, { status: 500 })
    }

    return NextResponse.json({ success: true, document })
  } catch (error: any) {
    console.error("[astrologer/profile/documents] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

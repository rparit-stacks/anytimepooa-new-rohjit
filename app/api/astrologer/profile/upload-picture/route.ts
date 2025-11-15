import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("astrologer_session_token")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get astrologer from session
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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${session.astrologer_id}-${Date.now()}.${fileExt}`
    const filePath = `astrologer_images/${fileName}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile_images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("[astrologer/upload-picture] Upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile_images").getPublicUrl(filePath)

    // Update astrologer profile with avatar URL
    const { data: updatedAstrologer, error: updateError } = await supabase
      .from("astrologers")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", session.astrologer_id)
      .select()
      .single()

    if (updateError) {
      console.error("[astrologer/upload-picture] Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: updatedAstrologer,
      avatar_url: publicUrl,
    })
  } catch (err: any) {
    console.error("[astrologer/upload-picture] Unexpected error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to upload image" },
      { status: 500 }
    )
  }
}

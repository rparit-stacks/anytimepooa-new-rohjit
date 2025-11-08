import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return Response.json({ error: "File size too large. Maximum size is 5MB." }, { status: 400 })
    }

    const supabase = await createClient()

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `profile_images/${fileName}`

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
      console.error("[v0] Upload error:", uploadError)
      return Response.json({ error: uploadError.message }, { status: 400 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile_images").getPublicUrl(filePath)

    // Update user profile with avatar URL
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Update error:", updateError)
      return Response.json({ error: updateError.message }, { status: 400 })
    }

    return Response.json({ data: updatedUser, avatar_url: publicUrl }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] Upload avatar error:", err)
    return Response.json({ error: err.message || "Failed to upload avatar" }, { status: 500 })
  }
}



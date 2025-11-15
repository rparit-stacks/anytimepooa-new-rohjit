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

    const { data: bankDetails, error } = await supabase
      .from("astrologer_bank_details")
      .select("*")
      .eq("astrologer_id", session.astrologer_id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[astrologer/profile/bank-details] Error:", error)
      return NextResponse.json({ error: "Failed to fetch bank details" }, { status: 500 })
    }

    return NextResponse.json({ success: true, bankDetails: bankDetails || [] })
  } catch (error: any) {
    console.error("[astrologer/profile/bank-details] Unexpected error:", error)
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

    const body = await request.json()
    const {
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      account_type,
      branch_name,
      upi_id,
    } = body

    // Check if this is the first bank account (make it primary)
    const { data: existingAccounts } = await supabase
      .from("astrologer_bank_details")
      .select("id")
      .eq("astrologer_id", session.astrologer_id)

    const isPrimary = !existingAccounts || existingAccounts.length === 0

    const { data: bankDetail, error } = await supabase
      .from("astrologer_bank_details")
      .insert({
        astrologer_id: session.astrologer_id,
        bank_name,
        account_holder_name,
        account_number,
        ifsc_code,
        account_type,
        branch_name,
        upi_id,
        is_primary: isPrimary,
        is_verified: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[astrologer/profile/bank-details] Error:", error)
      return NextResponse.json({ error: "Failed to add bank details" }, { status: 500 })
    }

    return NextResponse.json({ success: true, bankDetail })
  } catch (error: any) {
    console.error("[astrologer/profile/bank-details] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
